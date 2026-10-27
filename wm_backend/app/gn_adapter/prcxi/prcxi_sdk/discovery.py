"""NeonGenesis RPC 端口发现。"""

from __future__ import annotations

import os
import socket
import sys
from ctypes import POINTER, Structure, addressof, byref, cast, create_string_buffer, sizeof, windll
from ctypes import c_ulong, create_unicode_buffer
from ctypes.wintypes import BOOL, DWORD, HANDLE, LPWSTR

AF_INET = 2
ERROR_INSUFFICIENT_BUFFER = 122
MIB_TCP_STATE_LISTEN = 2
PROCESS_QUERY_LIMITED_INFORMATION = 0x1000
TCP_TABLE_OWNER_PID_ALL = 5


kernel32 = windll.kernel32
iphlpapi = windll.iphlpapi


class _MibTcpRowOwnerPid(Structure):
    _fields_ = [
        ("state", DWORD),
        ("local_addr", DWORD),
        ("local_port", DWORD),
        ("remote_addr", DWORD),
        ("remote_port", DWORD),
        ("owning_pid", DWORD),
    ]


kernel32.OpenProcess.argtypes = [DWORD, BOOL, DWORD]
kernel32.OpenProcess.restype = HANDLE
kernel32.CloseHandle.argtypes = [HANDLE]
kernel32.CloseHandle.restype = BOOL
kernel32.QueryFullProcessImageNameW.argtypes = [HANDLE, DWORD, LPWSTR, POINTER(DWORD)]
kernel32.QueryFullProcessImageNameW.restype = BOOL


def _process_path(pid: int) -> str:
    handle = kernel32.OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, False, pid)
    if not handle:
        return ""
    try:
        size = DWORD(32768)
        buffer = create_unicode_buffer(size.value)
        if not kernel32.QueryFullProcessImageNameW(handle, 0, buffer, byref(size)):
            return ""
        return buffer.value
    finally:
        kernel32.CloseHandle(handle)


def _process_name(pid: int) -> str:
    return os.path.basename(_process_path(pid))


def find_neon_genesis_ports() -> list[int]:
    """返回当前 NeonGenesis.exe 正在监听的 TCP 端口。"""
    if sys.platform != "win32":
        return []

    size = c_ulong(0)
    status = iphlpapi.GetExtendedTcpTable(None, byref(size), True, AF_INET, TCP_TABLE_OWNER_PID_ALL, 0)
    if status != ERROR_INSUFFICIENT_BUFFER:
        return []

    buffer = create_string_buffer(size.value)
    status = iphlpapi.GetExtendedTcpTable(buffer, byref(size), True, AF_INET, TCP_TABLE_OWNER_PID_ALL, 0)
    if status != 0:
        return []

    row_count = cast(buffer, POINTER(DWORD)).contents.value
    rows_type = _MibTcpRowOwnerPid * row_count
    rows = rows_type.from_address(addressof(buffer) + sizeof(DWORD))

    ports: set[int] = set()
    pid_name_cache: dict[int, str] = {}
    for row in rows:
        if row.state != MIB_TCP_STATE_LISTEN:
            continue
        pid = int(row.owning_pid)
        name = pid_name_cache.setdefault(pid, _process_name(pid))
        if name.lower() != "neongenesis.exe":
            continue
        port = socket.ntohs(int(row.local_port) & 0xFFFF)
        if 0 < port <= 65535:
            ports.add(port)
    return sorted(ports)


def find_neon_genesis_project_dirs() -> list[str]:
    """从本机运行中的 NeonGenesis.exe 路径推断 project 目录。"""
    if sys.platform != "win32":
        return []

    size = c_ulong(0)
    status = iphlpapi.GetExtendedTcpTable(None, byref(size), True, AF_INET, TCP_TABLE_OWNER_PID_ALL, 0)
    if status != ERROR_INSUFFICIENT_BUFFER:
        return []

    buffer = create_string_buffer(size.value)
    status = iphlpapi.GetExtendedTcpTable(buffer, byref(size), True, AF_INET, TCP_TABLE_OWNER_PID_ALL, 0)
    if status != 0:
        return []

    row_count = cast(buffer, POINTER(DWORD)).contents.value
    rows_type = _MibTcpRowOwnerPid * row_count
    rows = rows_type.from_address(addressof(buffer) + sizeof(DWORD))

    paths: set[str] = set()
    pid_path_cache: dict[int, str] = {}
    for row in rows:
        if row.state != MIB_TCP_STATE_LISTEN:
            continue
        pid = int(row.owning_pid)
        process_path = pid_path_cache.setdefault(pid, _process_path(pid))
        if os.path.basename(process_path).lower() != "neongenesis.exe":
            continue
        current = os.path.dirname(process_path)
        while current:
            project_dir = os.path.join(current, "project")
            if os.path.isdir(project_dir):
                paths.add(project_dir)
            parent = os.path.dirname(current)
            if parent == current:
                break
            current = parent
    return sorted(paths)
