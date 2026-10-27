"""ISolution 方案管理服务。"""

from __future__ import annotations

from typing import Any, List, Sequence

from ..models.solution import Solution
from ..models.solution_steps_v04 import SolutionStepV04
from .base import BaseService


class SolutionService(BaseService):
    service_name = "ISolution"

    def get_solution_list(self) -> List[Solution]:
        response = self._invoke("GetSolutionList")
        raw_items = response.data or []
        if not isinstance(raw_items, list):
            return []
        return [Solution.from_dict(item) for item in raw_items]

    def load_solution(self, solution_id: str) -> Any:
        return self._invoke("LoadSolution", [solution_id]).data

    def remove_solution(self, name: str) -> Any:
        return self._invoke("RemoveSolution", [name]).data

    def add_solution_v04(self, name: str, board_id: str, steps: Sequence[SolutionStepV04]) -> Any:
        return self._invoke("AddSolution_V04", [name, board_id, list(steps)]).data
