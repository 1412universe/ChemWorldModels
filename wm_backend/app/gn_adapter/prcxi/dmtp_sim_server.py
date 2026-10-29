# -*- coding: utf-8 -*-
"""有状态 DMTP 镜像服务 —— PRCXI 仿真档后端（对应 NeonGenesis.exe 的行为子集）。

为什么做成「真 DMTP 服务」而不是内存桩
------------------------------------
PrcxiDevice 仿真档与真机档必须走**同一条客户端代码路径**（vendor 的官方 SDK
DmtpTransport）。仿真档连的就是本服务：真握手（protocol 1/2）、真 RPC 外帧
（protocol 20/21）、真 FastBinary ResponseModel 编解码 —— 这样：
  · 客户端代码（帧编解码 / 签名配对 / 超时策略）在仿真档就被完整验证；
  · 切真机只是换 host:port，零代码改动。

实现的服务/方法（对齐 V4.0 服务端）：
  IClientSession.IsConnect                      → true
  IAutomation.Start/Stop/Pause/Resume/Reset/
              GetErrorCode/RemoveErrorCodet/
              GetResetStatus/GetStartStatus     → 状态机
  ISolution.GetSolutionList/LoadSolution/
              RemoveSolution/AddSolution_V04    → 内存方案库
  IMachineState.GetStepStateList/GetStepStatus/
              GetStepState/GetLocation/GetLocationList
  IMatrix.*_V04                                 → 内存布局

方案执行状态机：AddSolution_V04 → LoadSolution → Start →（若干秒后）终态，
GetStepStateList 返回逐步骤状态（0=未执行 1=执行中 2=完成 3=失败），
GetStartStatus 返回运行中标志。步骤推进在后台线程按 STEP_SECONDS 模拟时长。
"""
from __future__ import annotations

import json
import socket
import struct
import threading
import time
from typing import Any, Dict, List, Optional, Tuple

from .prcxi_dmtp.fastbinary import ResponseModel
from .prcxi_dmtp.framing import DmtpFrameDecoder, encode_frame
from .prcxi_dmtp.rpc import decode_response, encode_request, encode_response

# ---------------------------------------------------------------------------
# 帧层（服务端视角）
# ---------------------------------------------------------------------------
MAGIC = b"dm"
STEP_SECONDS = 0.35          # 每步骤仿真时长（1 步 0.35s：真实感知又不拖沓）
RESET_SECONDS = 2.0          # Reset 是整机复位，慢一点


def _read_exact(sock: socket.socket, n: int, deadline: float) -> bytes:
    out = bytearray()
    while len(out) < n:
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            raise TimeoutError("dmtp_sim 读超时")
        sock.settimeout(remaining)
        chunk = sock.recv(n - len(out))
        if not chunk:
            raise ConnectionError("客户端断开")
        out.extend(chunk)
    return bytes(out)


def _recv_frame(sock: socket.socket, decoder: DmtpFrameDecoder,
                pending: List, deadline: float):
    while True:
        if pending:
            return pending.pop(0)
        chunk = sock.recv(65536)
        if not chunk:
            raise ConnectionError("客户端断开")
        frames = decoder.feed(chunk)
        if frames:
            pending.extend(frames)
            return pending.pop(0)


# ---------------------------------------------------------------------------
# 状态模型
# ---------------------------------------------------------------------------
class SimSolution:
    """一份 V4.0 方案（名字 + 布局板 Id + 步骤列表）。"""

    def __init__(self, name: str, board_id: str, steps: List[Dict[str, Any]]):
        self.name = name
        self.board_id = board_id
        self.steps = steps


def _step_display(step: Dict[str, Any], idx: int) -> str:
    return str(step.get("DisplayName") or step.get("Kind") or ("Step%d" % (idx + 1)))


class DmtpSimServer:
    """单连接 DMTP 镜像服务。每次 accept 一个客户端，处理到断开。"""

    def __init__(self, host: str = "127.0.0.1", port: int = 0):
        self.host = host
        self.port = port
        self._lock = threading.RLock()
        self._solutions: Dict[str, SimSolution] = {}
        self._solution_seq = 0
        self._loaded: Optional[str] = None       # 当前 LoadSolution 的方案名
        self._running = False
        self._step_states: List[int] = []        # 逐步骤 0/1/2/3
        self._run_error: Optional[str] = None
        self._run_thread: Optional[threading.Thread] = None
        self._reset_done = True
        self._error_code: int = 0
        # 事件轨迹（给虚拟实时仿真 / 前端读数用）
        self._trace: List[Dict[str, Any]] = []
        self._server: Optional[socket.socket] = None
        self._accept_thread: Optional[threading.Thread] = None
        self._stopped = threading.Event()

    # ------------------------------------------------------------ 公共
    def start(self) -> int:
        """监听并开始 accept 循环；返回实际端口（port=0 时由系统分配）。"""
        srv = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        srv.bind((self.host, self.port))
        srv.listen(4)
        srv.settimeout(1.0)
        self._server = srv
        self.port = srv.getsockname()[1]
        self._accept_thread = threading.Thread(target=self._accept_loop,
                                               name="prcxi-dmtp-sim", daemon=True)
        self._accept_thread.start()
        return self.port

    def stop(self) -> None:
        self._stopped.set()
        srv, self._server = self._server, None
        if srv is not None:
            try:
                srv.close()
            except OSError:
                pass
        self._reset_sim()

    def snapshot(self) -> Dict[str, Any]:
        with self._lock:
            return {
                "running": self._running,
                "loaded_solution": self._loaded,
                "solutions": {k: len(v.steps) for k, v in self._solutions.items()},
                "step_states": list(self._step_states),
                "step_labels": [(_step_display(s, i))
                                for i, s in enumerate((self._solutions.get(self._loaded)
                                                       or SimSolution("", "", [])).steps)],
                "error_code": self._error_code,
                "reset_done": self._reset_done,
            }

    # ------------------------------------------------------------ 内部
    def _reset_sim(self) -> None:
        with self._lock:
            self._running = False
            self._step_states = []
            self._loaded = None
            self._error_code = 0
            self._reset_done = True

    def _log(self, kind: str, **kw) -> None:
        with self._lock:
            entry = dict(kw)
            entry["kind"] = kind                      # 调用方的 kw 不得覆盖事件类型
            entry["t"] = round(time.time(), 3)
            self._trace.append(entry)
            if len(self._trace) > 200:
                del self._trace[:100]

    def _accept_loop(self) -> None:
        while not self._stopped.is_set():
            try:
                client, _addr = self._server.accept()
            except socket.timeout:
                continue
            except OSError:
                break
            t = threading.Thread(target=self._serve_client, args=(client,),
                                 name="prcxi-dmtp-sim-conn", daemon=True)
            t.start()

    def _serve_client(self, sock: socket.socket) -> None:
        sock.settimeout(5.0)
        decoder = DmtpFrameDecoder()
        pending: List = []
        client_id = "01-00-00-00"
        try:
            while True:
                frame = _recv_frame(sock, decoder, pending, time.monotonic() + 3600.0)
                if frame.protocol == 1:
                    # 握手：回 Status=1 + 分配 Id（照抄真实日志的实例命名）
                    req = json.loads(frame.body.decode("utf-8"))
                    resp = {"Token": req.get("Token"), "Id": client_id,
                            "Metadata": None, "Sign": req.get("Sign"),
                            "Status": 1, "Message": None}
                    body = json.dumps(resp, ensure_ascii=False,
                                      separators=(",", ":")).encode("utf-8")
                    sock.sendall(encode_frame(2, body))
                    continue
                if frame.protocol == 20:
                    self._handle_rpc(sock, frame.body, client_id)
                    continue
                # 其它协议号：忽略（真实服务端也只处理握手与 RPC）
        except (ConnectionError, OSError):
            pass
        finally:
            try:
                sock.close()
            except OSError:
                pass

    # ------------------------------------------------------------ RPC 分发
    def _handle_rpc(self, sock: socket.socket, body: bytes, client_id: str) -> None:
        # 请求体结构（对齐 prcxi_dmtp.rpc.encode_request）：
        #   router: 0x01 + source(1B长度串) + target(1B长度串) + 0x00 + sign(i32)+status(u8)
        #   0x00（FastBinary 序列化） + key(1B长度串) + 0x02（WaitInvoke）
        #   return_type(2B长度串) + 参数计数(1B) + 各参数（FastBinary 全编码）
        pos = 0
        if body[pos] != 1:
            raise ValueError("router version")
        pos += 1

        def _take_str1(p):
            n = body[p]
            p += 1
            if n == 0xFF:
                return None, p
            return body[p:p + n].decode("utf-8"), p + n

        _source, pos = _take_str1(pos)
        _target, pos = _take_str1(pos)
        pos += 1                                        # metadata 0x00
        sign = struct.unpack_from("<i", body, pos)[0]
        pos += 5                                        # sign(i32) + status(u8)
        pos += 1                                        # 序列化类型 0x00
        key, pos = _take_str1(pos)
        pos += 1                                        # feedback 0x02
        rt_len = struct.unpack_from("<H", body, pos)[0]
        pos += 2
        if rt_len != 0xFFFF:
            pos += rt_len                               # return_type 字符串体
        # n_params = body[pos]（GetResponse 恒 3，这里不校验）
        pos += 1
        params_raw = body[pos:]
        try:
            assert key == "GetResponse", "镜像服务只处理 GetResponse，收到 %r" % key
            service, method, args = self._parse_getresponse_params(params_raw)
            result = self._invoke(service, method, args)
            data_str = (json.dumps(result, ensure_ascii=False, separators=(",", ":"))
                        if result is not None else "null")
            resp_body = encode_response(sign, ResponseModel(True, data_str, None),
                                        status=1, message=None)
            sock.sendall(encode_frame(21, resp_body))
        except Exception as exc:                                  # noqa: BLE001
            try:
                resp_body = encode_response(
                    sign,
                    ResponseModel(False, None, "%s: %s" % (type(exc).__name__, exc)),
                    status=1, message=None)
                sock.sendall(encode_frame(21, resp_body))
            except Exception:                                     # noqa: BLE001
                pass

    def _parse_getresponse_params(self, raw: bytes) -> Tuple[str, str, Any]:
        """FastBinary 解 GetResponse 的三个参数（service:str, method:str, args_json:str）。

        encode_request 对每个参数调用 encode_value() —— 顶层参数是**全编码**
        （自带版本字节），所以直接 fb_decode(raw, str, 0) 依次解即可。
        """
        from .prcxi_dmtp.fastbinary import decode as fb_decode
        service, pos = fb_decode(raw, str, 0)
        method, pos = fb_decode(raw, str, pos)
        args_json, _pos = fb_decode(raw, str, pos)
        args = json.loads(args_json) if args_json else []
        return service, method, args

    # ------------------------------------------------------------ 业务实现
    def _invoke(self, service: str, method: str, args: List[Any]) -> Any:
        self._log("rpc", service=service, method=method, args_len=len(args or []))
        if service == "IClientSession":
            if method == "IsConnect":
                return True
        elif service == "IAutomation":
            if method == "Start":
                return self._do_start()
            if method == "Stop":
                with self._lock:
                    self._running = False
                self._log("stopped")
                return True
            if method == "Pause" or method == "Resume":
                return True
            if method == "Reset":
                return self._do_reset()
            if method == "GetErrorCode":
                with self._lock:
                    return self._error_code
            if method == "RemoveErrorCodet":                    # 服务端就这么拼（带 t）
                with self._lock:
                    self._error_code = 0
                return True
            if method == "GetResetStatus":
                with self._lock:
                    # 真机：true = 正在复位，完成后回到 false。
                    return not self._reset_done
            if method == "GetStartStatus":
                with self._lock:
                    return self._running
        elif service == "ISolution":
            if method == "GetSolutionList":
                with self._lock:
                    return [{"Name": s.name, "BoardId": s.board_id,
                             "StepCount": len(s.steps)}
                            for s in self._solutions.values()]
            if method == "LoadSolution":
                name = args[0]
                with self._lock:
                    if name not in self._solutions:
                        raise KeyError("方案不存在：%r" % name)
                    self._loaded = name
                    self._step_states = [0] * len(self._solutions[name].steps)
                self._log("solution_loaded", name=name)
                return True
            if method == "RemoveSolution":
                name = args[0]
                with self._lock:
                    removed = self._solutions.pop(name, None)
                    if self._loaded == name:
                        self._loaded = None
                        self._step_states = []
                return removed is not None
            if method == "AddSolution_V04":
                name, board_id, steps = args[0], args[1], args[2]
                with self._lock:
                    if not name:
                        raise ValueError("方案名不能为空")
                    # 对齐真机（2026-10-16 实测）：空 steps 被服务端拒
                    # 「方案步骤不能为空 (Parameter 'steps')」—— 仿真档提前拦住
                    if not steps:
                        raise ValueError("方案步骤不能为空")
                    if name in self._solutions:
                        self._solutions.pop(name)
                    self._solutions[name] = SimSolution(name, board_id, list(steps or []))
                    self._solution_seq += 1
                self._log("solution_added", name=name, steps=len(steps or []))
                return True
        elif service == "IMachineState":
            if method == "GetStepStateList":
                with self._lock:
                    return list(self._step_states)
            if method == "GetStepStatus" or method == "GetStepState":
                no = int(args[0])
                with self._lock:
                    if 1 <= no <= len(self._step_states):
                        return self._step_states[no - 1]
                return 0
            if method == "GetLocation":
                return [0.0, 0.0, 0.0]
            if method == "GetLocationList":
                return [[0.0, 0.0, 0.0]]
        elif service == "IMatrix":
            if method == "GetWorkTabletMatrices_V04":
                with self._lock:
                    # 镜像真机语义：返回一个 4×4 布局（T1..T16），让适配器的
                    # _resolve_board_id 在仿真档也能解析到合理 BoardId
                    return [{
                        "Id": "sim_board_9320_366", "Name": "9320-366",
                        "Rows": 4, "Columns": 4, "Details": [
                            {"Number": i + 1, "Name": "T%d" % (i + 1),
                             "Row": i // 4, "Column": i % 4}
                            for i in range(16)],
                    }]
            if method == "GetAllMaterial_V04":
                return []
        # —— 未知方法：与真实服务端一致，响亮报错而不是静默
        raise NotImplementedError("DMTP 镜像服务未实现 %s.%s（参数 %r）"
                                  % (service, method, args))

    def _do_start(self) -> bool:
        with self._lock:
            if self._running:
                return True                       # 幂等：已在运行
            if not self._loaded:
                raise RuntimeError("没有已装载的方案，先 LoadSolution")
            steps = self._solutions[self._loaded].steps
            self._step_states = [0] * len(steps)
            self._run_error = None
            self._running = True
        self._log("started", solution=self._loaded, steps=len(steps))
        t = threading.Thread(target=self._run_steps, args=(list(steps),),
                             name="prcxi-sim-run", daemon=True)
        t.start()
        return True

    def _run_steps(self, steps: List[Dict[str, Any]]) -> None:
        try:
            for i, step in enumerate(steps):
                with self._lock:
                    if not self._running:
                        return                    # Stop 中断
                    self._step_states[i] = 1
                kind = step.get("Kind") or "?"
                self._log("step_start", index=i + 1, step_kind=kind)
                time.sleep(STEP_SECONDS)
                with self._lock:
                    self._step_states[i] = 2
                self._log("step_done", index=i + 1, step_kind=kind)
            with self._lock:
                self._running = False
            self._log("run_finished", solution=self._loaded)
        except Exception as exc:                                  # noqa: BLE001
            with self._lock:
                self._running = False
                self._run_error = str(exc)
            self._log("run_error", error=str(exc))

    def _do_reset(self) -> bool:
        with self._lock:
            self._reset_done = False
            self._error_code = 0
        self._log("reset_start")

        def _finish():
            time.sleep(RESET_SECONDS)
            with self._lock:
                self._reset_done = True
            self._log("reset_done")

        threading.Thread(target=_finish, name="prcxi-sim-reset", daemon=True).start()
        return True


# ---------------------------------------------------------------------------
# 进程级单例（仿真档共用一个镜像服务）
# ---------------------------------------------------------------------------
_singleton: Optional[DmtpSimServer] = None
_singleton_lock = threading.RLock()


def get_sim_server() -> DmtpSimServer:
    """取（或启动）进程级 DMTP 镜像服务（127.0.0.1 随机端口）。"""
    global _singleton
    with _singleton_lock:
        if _singleton is None:
            srv = DmtpSimServer(host="127.0.0.1", port=0)
            srv.start()
            _singleton = srv
        return _singleton


def shutdown_sim_server() -> None:
    global _singleton
    with _singleton_lock:
        srv, _singleton = _singleton, None
        if srv is not None:
            srv.stop()
