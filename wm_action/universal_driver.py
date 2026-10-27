# -*- coding: utf-8 -*-
"""设备驱动基类。OPC 客户端只使用日志初始化和外部 JSON 命令入口。"""

import json
import logging
import traceback


class UniversalDriver(object):
    def _init_logger(self):
        self.logger = logging.getLogger("%s_logger" % self.__class__.__name__)

    def __init__(self):
        self._init_logger()

    def execute_command_from_outer(self, command: str):
        try:
            command = json.loads(
                command.replace("'", '"').replace("False", "false").replace("True", "true")
            )
        except Exception as exc:
            print("Json解析失败: %s" % exc)
            return False
        for name, kwargs in command.items():
            try:
                getattr(self, name)(**kwargs)
            except Exception as exc:
                print("执行%s方法失败: %s" % (name, exc))
                traceback.print_exc()
                return False
        return True
