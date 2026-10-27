"""IMatrix V04 布局服务（仅 _V04 接口）。"""

from __future__ import annotations

from typing import Any, List

from ..exceptions import RpcResponseError
from ..models.board import Board
from ..models.rpc_response import Result
from ..models.serialization import parse_rpc_bool
from .base import BaseService


class MatrixV04Service(BaseService):
    """V04 工作台布局接口封装。

    旧版无 ``_V04`` 后缀的 IMatrix 方法在 V04 服务端会抛出
    ``NotImplementedException``，本 SDK 不封装旧接口。
    """

    service_name = "IMatrix"

    def get_work_tablet_matrices(self) -> List[Board]:
        response = self._invoke("GetWorkTabletMatrices_V04")
        raw_items = response.data or []
        if not isinstance(raw_items, list):
            return []
        return [Board.from_dict(item) for item in raw_items]

    def get_work_tablet_matrix_by_id(self, matrix_id: str) -> Board:
        response = self._invoke("GetWorkTabletMatrixById_V04", [matrix_id])
        data = response.data
        if not isinstance(data, dict) or not isinstance(data.get("Id"), str) or not data["Id"].strip():
            raise RpcResponseError("IMatrix.GetWorkTabletMatrixById_V04 返回无效布局", response)
        return Board.from_dict(data)

    def _to_result(self, response) -> Result:
        data = response.data
        if isinstance(data, dict):
            return Result(
                success=parse_rpc_bool(data.get("Success"), "IMatrix Data.Success"),
                message=data.get("Message") or data.get("Msg"),
            )
        return Result(
            success=parse_rpc_bool(data, "IMatrix Data"),
            message=response.message,
        )

    def add_work_tablet_matrix(self, board: Board) -> Result:
        return self._to_result(self._invoke("AddWorkTabletMatrix_V04", [board]))

    def remove_work_tablet_matrix(self, matrix_id: str) -> Result:
        return self._to_result(self._invoke("RemoveWorkTabletMatrix_V04", [matrix_id]))

    def update_position(self, board: Board) -> Result:
        return self._to_result(self._invoke("UpdatePosition_V04", [board]))

    def get_all_material(self) -> Any:
        return self._invoke("GetAllMaterial_V04").data

    def get_material_by_id(self, material_id: str) -> Any:
        return self._invoke("GetMaterialById_V04", [material_id]).data
