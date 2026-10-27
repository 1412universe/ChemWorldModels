"""V04 Board / IMatrix 数据模型。"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class PipettingPos:
  id: Optional[str] = None
  create_time: Optional[str] = None
  update_time: Optional[str] = None
  board_detail_id: Optional[str] = None
  axis_enum: Optional[str] = None
  volume_enum: Optional[str] = None
  x_position: float = 0.0
  y_position: float = 0.0
  bottle_mouth_position: float = 0.0
  bottle_bottom_position: float = 0.0
  left_wall_distance: float = 0.0
  right_wall_distance: float = 0.0
  z_wall_distance: float = 0.0
  safe_altitude: float = 0.0

  def to_rpc_dict(self) -> Dict[str, Any]:
    return {
      "Id": self.id,
      "CreateTime": self.create_time,
      "UpdateTime": self.update_time,
      "BoardDetailId": self.board_detail_id,
      "AxisEnum": self.axis_enum,
      "VolumeEnum": self.volume_enum,
      "xPosition": self.x_position,
      "yPosition": self.y_position,
      "bottleMouthPosition": self.bottle_mouth_position,
      "bottleBottomPosition": self.bottle_bottom_position,
      "leftWallDistance": self.left_wall_distance,
      "rightWallDistance": self.right_wall_distance,
      "zWallDistance": self.z_wall_distance,
      "SafeAltitude": self.safe_altitude,
    }

  @classmethod
  def from_dict(cls, payload: Dict[str, Any]) -> "PipettingPos":
    return cls(
      id=payload.get("Id"),
      create_time=payload.get("CreateTime"),
      update_time=payload.get("UpdateTime"),
      board_detail_id=payload.get("BoardDetailId"),
      axis_enum=payload.get("AxisEnum"),
      volume_enum=payload.get("VolumeEnum"),
      x_position=float(payload.get("xPosition") or 0.0),
      y_position=float(payload.get("yPosition") or 0.0),
      bottle_mouth_position=float(payload.get("bottleMouthPosition") or 0.0),
      bottle_bottom_position=float(payload.get("bottleBottomPosition") or 0.0),
      left_wall_distance=float(payload.get("leftWallDistance") or 0.0),
      right_wall_distance=float(payload.get("rightWallDistance") or 0.0),
      z_wall_distance=float(payload.get("zWallDistance") or 0.0),
      safe_altitude=float(payload.get("SafeAltitude") or 0.0),
    )


@dataclass
class GripperPos:
  id: Optional[str] = None
  create_time: Optional[str] = None
  update_time: Optional[str] = None
  board_detail_id: Optional[str] = None
  axis_enum: Optional[str] = None
  x_position: float = 0.0
  y_position: float = 0.0
  z_buffer_position: float = 0.0
  z_position: float = 0.0
  z2_position: float = 0.0
  gripper_position: float = 0.0

  def to_rpc_dict(self) -> Dict[str, Any]:
    return {
      "Id": self.id,
      "CreateTime": self.create_time,
      "UpdateTime": self.update_time,
      "BoardDetailId": self.board_detail_id,
      "AxisEnum": self.axis_enum,
      "xPosition": self.x_position,
      "yPosition": self.y_position,
      "zBufferPosition": self.z_buffer_position,
      "zPosition": self.z_position,
      "z2Position": self.z2_position,
      "gripperPosition": self.gripper_position,
    }

  @classmethod
  def from_dict(cls, payload: Dict[str, Any]) -> "GripperPos":
    return cls(
      id=payload.get("Id"),
      create_time=payload.get("CreateTime"),
      update_time=payload.get("UpdateTime"),
      board_detail_id=payload.get("BoardDetailId"),
      axis_enum=payload.get("AxisEnum"),
      x_position=float(payload.get("xPosition") or 0.0),
      y_position=float(payload.get("yPosition") or 0.0),
      z_buffer_position=float(payload.get("zBufferPosition") or 0.0),
      z_position=float(payload.get("zPosition") or 0.0),
      z2_position=float(payload.get("z2Position") or 0.0),
      gripper_position=float(payload.get("gripperPosition") or 0.0),
    )


@dataclass
class BoardPosition:
  id: Optional[str] = None
  create_time: Optional[str] = None
  update_time: Optional[str] = None
  board_detail_id: Optional[str] = None
  board_name: Optional[str] = None
  board_number: int = 0
  x_spacing: float = 0.0
  y_spacing: float = 0.0

  def to_rpc_dict(self) -> Dict[str, Any]:
    return {
      "Id": self.id,
      "CreateTime": self.create_time,
      "UpdateTime": self.update_time,
      "BoardDetailId": self.board_detail_id,
      "BoardName": self.board_name,
      "BoardNumber": self.board_number,
      "xSpacing": self.x_spacing,
      "ySpacing": self.y_spacing,
    }

  @classmethod
  def from_dict(cls, payload: Dict[str, Any]) -> "BoardPosition":
    return cls(
      id=payload.get("Id"),
      create_time=payload.get("CreateTime"),
      update_time=payload.get("UpdateTime"),
      board_detail_id=payload.get("BoardDetailId"),
      board_name=payload.get("BoardName"),
      board_number=int(payload.get("BoardNumber") or 0),
      x_spacing=float(payload.get("xSpacing") or 0.0),
      y_spacing=float(payload.get("ySpacing") or 0.0),
    )


@dataclass
class BoardDetail:
  id: Optional[str] = None
  create_time: Optional[str] = None
  update_time: Optional[str] = None
  board_id: Optional[str] = None
  name: Optional[str] = None
  number: int = 0
  row: int = 0
  column: int = 0
  row_span: int = 1
  column_span: int = 1
  volume: int = 0
  material_id: Optional[str] = None
  module: Optional[str] = None
  position: Optional[BoardPosition] = None
  pipetting_pos_list: List[PipettingPos] = field(default_factory=list)
  gripper_pos: Optional[GripperPos] = None

  def to_rpc_dict(self) -> Dict[str, Any]:
    return {
      "Id": self.id,
      "CreateTime": self.create_time,
      "UpdateTime": self.update_time,
      "BoardId": self.board_id,
      "Name": self.name,
      "Number": self.number,
      "Row": self.row,
      "Column": self.column,
      "RowSpan": self.row_span,
      "ColumnSpan": self.column_span,
      "Volume": self.volume,
      "MaterialId": self.material_id,
      "Module": self.module,
      "Position": self.position.to_rpc_dict() if self.position else None,
      "PipettingPosList": [item.to_rpc_dict() for item in self.pipetting_pos_list],
      "gripperPos": self.gripper_pos.to_rpc_dict() if self.gripper_pos else None,
    }

  @classmethod
  def from_dict(cls, payload: Dict[str, Any]) -> "BoardDetail":
    pipetting_raw = payload.get("PipettingPosList") or []
    gripper_raw = payload.get("gripperPos")
    position_raw = payload.get("Position")
    return cls(
      id=payload.get("Id"),
      create_time=payload.get("CreateTime"),
      update_time=payload.get("UpdateTime"),
      board_id=payload.get("BoardId"),
      name=payload.get("Name"),
      number=int(payload.get("Number") or 0),
      row=int(payload.get("Row") or 0),
      column=int(payload.get("Column") or 0),
      row_span=int(payload.get("RowSpan") or 1),
      column_span=int(payload.get("ColumnSpan") or 1),
      volume=int(payload.get("Volume") or 0),
      material_id=payload.get("MaterialId"),
      module=payload.get("Module"),
      position=BoardPosition.from_dict(position_raw) if position_raw else None,
      pipetting_pos_list=[PipettingPos.from_dict(item) for item in pipetting_raw],
      gripper_pos=GripperPos.from_dict(gripper_raw) if gripper_raw else None,
    )


@dataclass
class Board:
  id: Optional[str] = None
  create_time: Optional[str] = None
  update_time: Optional[str] = None
  name: Optional[str] = None
  rows: int = 0
  columns: int = 0
  device_type: Optional[str] = None
  details: List[BoardDetail] = field(default_factory=list)

  def to_rpc_dict(self) -> Dict[str, Any]:
    return {
      "Id": self.id,
      "CreateTime": self.create_time,
      "UpdateTime": self.update_time,
      "Name": self.name,
      "Rows": self.rows,
      "Columns": self.columns,
      "DeviceType": self.device_type,
      "Details": [detail.to_rpc_dict() for detail in self.details],
    }

  @classmethod
  def from_dict(cls, payload: Dict[str, Any]) -> "Board":
    details_raw = payload.get("Details") or []
    return cls(
      id=payload.get("Id"),
      create_time=payload.get("CreateTime"),
      update_time=payload.get("UpdateTime"),
      name=payload.get("Name"),
      rows=int(payload.get("Rows") or 0),
      columns=int(payload.get("Columns") or 0),
      device_type=payload.get("DeviceType"),
      details=[BoardDetail.from_dict(item) for item in details_raw],
    )
