"""导出24点排产CSV（UTF-8 BOM，Excel可直接打开）。"""
from pathlib import Path
_ROOT = Path(__file__).resolve().parent.parent
_DATA = _ROOT / "data"
_WM = Path(__file__).resolve().parent
import json, csv

R = json.load(open(_WM / "_bo_result.json"))
points = R["points"]


def win(n):
    a, b = (n - 1) * 18, n * 18
    return f"{a//60:02d}:{a%60:02d}-{b//60:02d}:{b%60:02d}"


def lock(step):
    if "CH4" in step:
        return "O2=1.0; 光强/温度锁"
    if "O2" in step:
        return "CH4=69; 光强/温度锁"
    if "Ar" in step:
        return "CH4=69; O2=1.0; 光强/温度锁"
    return "CH4/O2/Ar/光强/温度全锁"


out = str(_DATA / "排产24点_世界模型BO.csv")
with open(out, "w", newline="", encoding="utf-8-sig") as f:
    w = csv.writer(f)
    w.writerow(["实验#", "催化剂", "组内", "步进", "CH4(mL/min)", "O2(mL/min)",
                "Ar(mL/min)", "总流量", "时间窗(18min/组)", "预测产率μmol/g/h",
                "预测sel_C2/%", "本步只变", "锁定项", "备注"])
    for p in points:
        w.writerow([p["exp"], f'{p["metal"]}/{p["sup"]}', p["inner"], p["step"],
                    p["ch4"], p["o2"], p["ar"], p["tot"], win(p["exp"]),
                    p["pred_y"], p["pred_sel"], p["step"], lock(p["step"]),
                    "锚点E1" if p["inner"] == "E1" else "世界模型条件估算"])
print("CSV ->", out)
