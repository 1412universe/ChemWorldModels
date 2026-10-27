"""方案相关模型。"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Optional


@dataclass
class Solution:
  plan_name: str
  annotate: Optional[str] = None
  id: Optional[str] = None
  create_time: Optional[str] = None
  matrix_id: Optional[str] = None
  plan_code: Optional[str] = None
  plan_targe: Optional[str] = None

  def to_rpc_dict(self) -> Dict[str, Any]:
    return {
      "Id": self.id,
      "CreateTime": self.create_time,
      "MatrixId": self.matrix_id,
      "PlanCode": self.plan_code,
      "PlanName": self.plan_name,
      "PlanTarge": self.plan_targe,
      "Annotate": self.annotate,
    }

  @classmethod
  def from_dict(cls, payload: Dict[str, Any]) -> "Solution":
    return cls(
      id=payload.get("Id"),
      create_time=payload.get("CreateTime"),
      matrix_id=payload.get("MatrixId"),
      plan_code=payload.get("PlanCode"),
      plan_name=payload.get("PlanName") or "",
      plan_targe=payload.get("PlanTarge"),
      annotate=payload.get("Annotate"),
    )
