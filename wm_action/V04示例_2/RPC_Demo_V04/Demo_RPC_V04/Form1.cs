using Prcxi.Lilith.Client;
using Prcxi.Lilith.Interface;
using Prcxi.Lilith.Model;
using System.ComponentModel;
using System.Reflection;

namespace Demo_RPC_V04
{
    public partial class Form1 : Form
    {
        /// <summary>服务端 IP（从页面输入框读取）</summary>
        private string Host => string.IsNullOrWhiteSpace(textBoxHost.Text) ? "127.0.0.1" : textBoxHost.Text.Trim();

        /// <summary>服务端端口（从页面输入框读取，解析失败用默认 9999）</summary>
        private int Port => int.TryParse(textBoxPort.Text.Trim(), out var p) ? p : 9999;

        /// <summary>当前选择的协议版本：true = V03，false = V04</summary>
        private bool IsV03 => comboBoxVersion.SelectedItem?.ToString() == "V03";

        private LilithClient? _lilithClient;
        private IMatrix? matrix;
        private IAutomation? automation;
        private ISolution? solution;
        private IMachineState? machineState;

        public Form1()
        {
            InitializeComponent();
            comboBoxVersion.SelectedIndex = 0; // 默认 V04
            // 注入超时回调：RPC 超时后重建连接，隔离已卡死的线程
            RpcTimeout.OnTimeout = Reconnect;
        }
        /// <summary>
        /// ????
        /// </summary>
        /// <param name="sender"></param>
        /// <param name="e"></param>
        private void button3_Click(object sender, EventArgs e)
        {
            bool connected = Connect();
            label1.Text = connected ? "已连接" : "连接失败";
        }

        /// <summary>
        /// 建立（或重建）到服务端的连接，并刷新各接口引用。
        /// 返回是否连接成功。
        /// </summary>
        private bool Connect()
        {
            try
            {
                Reconnect();
                if (_lilithClient == null) return false;

                bool connected;
                try
                {
                    connected = RpcTimeout.Call(() => _lilithClient.IsConnected, "IsConnected");
                }
                catch (TimeoutException)
                {
                    connected = false;
                }
                catch (RpcBusyException)
                {
                    connected = false;
                }
                return connected;
            }
            catch (Exception)
            {
                return false;
            }
        }

        /// <summary>
        /// 重建连接：先异步释放旧连接（避免 Dispose 同步等待卡住 UI），
        /// 再新建 LilithClient 并重新赋值各接口字段。
        /// 由于超时回调可能被多个卡死线程并发触发，这里用锁保证同一时刻只有一个重建过程。
        /// </summary>
        private void Reconnect()
        {
            lock (_reconnectLock)
            {
                var old = _lilithClient;
                _lilithClient = null;

                // 异步释放旧连接，不阻塞当前线程；旧的卡死线程会随连接释放逐渐退出
                if (old != null)
                {
                    Task.Run(() =>
                    {
                        try { old.Dispose(); }
                        catch { /* 释放失败可忽略，旧连接交由 GC 处理 */ }
                    });
                }

                // 新建连接（enableEventPolling 使用默认值 true，与原 button3_Click 行为一致）
                var client = new LilithClient(Host, Port);
                automation = client.Automation;
                matrix = client.Matrix;
                solution = client.Solution;
                machineState = client.MachineState;
                _lilithClient = client;
            }
        }

        private readonly object _reconnectLock = new();

        /// <summary>
        /// 统一包装无返回值的 RPC 调用，捕获所有异常并给出友好提示，
        /// 保证任何按钮点击都不会因未处理异常导致 UI 崩溃或假死。
        /// </summary>
        private void SafeCall(Action action, string operationName)
        {
            try
            {
                RpcTimeout.Call(action, operationName);
            }
            catch (RpcBusyException ex)
            {
                MessageBox.Show(ex.Message, "系统繁忙", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
            catch (TimeoutException ex)
            {
                MessageBox.Show(ex.Message + "\r\n已尝试自动重建连接，请稍后重试。", "调用超时", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"操作「{operationName}」失败：{ex.Message}", "错误", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        /// <summary>
        /// 统一包装带返回值的 RPC 调用。成功返回结果，失败时弹窗提示并返回 default。
        /// </summary>
        private T? SafeCall<T>(Func<T> func, string operationName)
        {
            try
            {
                return RpcTimeout.Call(func, operationName);
            }
            catch (RpcBusyException ex)
            {
                MessageBox.Show(ex.Message, "系统繁忙", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
            catch (TimeoutException ex)
            {
                MessageBox.Show(ex.Message + "\r\n已尝试自动重建连接，请稍后重试。", "调用超时", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"操作「{operationName}」失败：{ex.Message}", "错误", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
            return default;
        }
        /// <summary>
        /// ??
        /// </summary>
        /// <param name="sender"></param>
        /// <param name="e"></param>
        private void button1_Click(object sender, EventArgs e)
        {
            SafeCall(() => automation!.Stop(), "Stop");
        }
        /// <summary>
        /// ??λ
        /// </summary>
        /// <param name="sender"></param>
        /// <param name="e"></param>
        private void button2_Click(object sender, EventArgs e)
        {
            SafeCall(() => automation!.Reset(), "Reset");
        }

        /// <summary>
        /// ????
        /// </summary>
        /// <param name="sender"></param>
        /// <param name="e"></param>
        private void button4_Click(object sender, EventArgs e)
        {
            SafeCall(() => automation!.Start(), "Start");
        }
        /// <summary>
        /// ???
        /// </summary>
        /// <param name="sender"></param>
        /// <param name="e"></param>
        private void button6_Click(object sender, EventArgs e)
        {
            SafeCall(() => automation!.Pause(), "Pause");
        }
        /// <summary>
        /// ????
        /// </summary>
        /// <param name="sender"></param>
        /// <param name="e"></param>
        private void button5_Click(object sender, EventArgs e)
        {
            SafeCall(() => automation!.Resume(), "Resume");
        }
        /// <summary>
        /// ???????
        /// </summary>
        /// <param name="sender"></param>
        /// <param name="e"></param>
        private void button7_Click(object sender, EventArgs e)
        {
            var list = SafeCall(() => solution!.GetSolutionList(), "GetSolutionList");
            if (list == null) return;
            listView1.Columns.Clear();
            listView1.Items.Clear();
            listView1.Columns.Add("????????", 220);
            listView1.View = View.Details;
            foreach (var item in list)
            {
                var lvi = new ListViewItem(item.PlanName);
                lvi.Tag = item;
                listView1.Items.Add(lvi);
            }
        }
        /// <summary>
        /// ?????????
        /// </summary>
        /// <param name="sender"></param>
        /// <param name="e"></param>
        private void button8_Click(object sender, EventArgs e)
        {
            SetlistView2();
        }
        /// <summary>
        /// ???÷???
        /// </summary>
        /// <param name="sender"></param>
        /// <param name="e"></param>
        private void ListView1_MouseDoubleClick(object sender, MouseEventArgs e)
        {
            if (listView1.SelectedItems.Count == 0) return;
            var selectedItem = listView1.SelectedItems[0];
            if (IsV03)
            {
                // V03：LoadSolution 需要传方案 ID（uuid），获取方案列表时已把 Solution 对象存入 Tag
                var solutionId = (selectedItem.Tag as Solution)?.Id ?? selectedItem.Text;
                SafeCall(() => solution!.LoadSolution(solutionId), "LoadSolution");
            }
            else
            {
                // V04：LoadSolution 传方案名称
                SafeCall(() => solution!.LoadSolution(selectedItem.Text), "LoadSolution");
            }
            SetlistView2();
        }
        /// <summary>
        /// ?????????
        /// </summary>
        private void SetlistView2()
        {
            var list = SafeCall(() => machineState!.GetStepStateList(), "GetStepStateList");
            if (list == null) return;
            listView2.Columns.Clear();
            listView2.Items.Clear();
            listView2.Columns.Add("???", 60);
            listView2.Columns.Add("????", 120);
            listView2.Columns.Add("??", 120);
            listView2.View = View.Details;
            foreach (var item in list)
            {
                var lvi = new ListViewItem(item.SequenceNumber.ToString());
                lvi.SubItems.Add(item.Name);
                lvi.SubItems.Add(GetDescription(item.State));
                lvi.Tag = item;
                listView2.Items.Add(lvi);
            }
        }
        public static string GetDescription(Enum val)
        {
            var field = val.GetType().GetField(val.ToString());
            if (field == null) return val.ToString();

            var attr = field.GetCustomAttribute<DescriptionAttribute>();
            return attr?.Description ?? val.ToString();
        }

        private void button9_Click(object sender, EventArgs e)
        {
            if (solution == null)
            {
                ShowBoardsTree(null, "请先连接");
                return;
            }
            if (string.IsNullOrWhiteSpace(textBox1.Text))
                return;

            try
            {
                if (IsV03)
                {
                    // V03：AddSolution(方案名, 版位组合Id, List<StepData>)
                    // 优先取布局树中选中的版位组合，未选中时回退第一个
                    var matrixId = (treeViewBoards.SelectedNode?.Tag as WorkTabletMatrix)?.MatrixId
                                   ?? _matrices?.FirstOrDefault()?.MatrixId
                                   ?? string.Empty;
                    var planId = RpcTimeout.Call(
                        () => solution!.AddSolution(textBox1.Text, matrixId, CreateV03Steps()),
                        "AddSolution",
                        60);
                    MessageBox.Show($"V03 方案已添加, 方案ID: {planId}", "提示");
                }
                else
                {
                    // V04：AddSolution_V04(方案名, 板位布局Id, List<SolutionStepBase_V04>)
                    // 优先取布局树中选中的板位布局，未选中时回退第一个
                    var board = treeViewBoards.SelectedNode?.Tag as Board ?? _boards?.FirstOrDefault();
                    if (board == null)
                    {
                        ShowBoardsTree(null, "请先获取布局");
                        return;
                    }
                    var planName = RpcTimeout.Call(
                        () => solution!.AddSolution_V04(
                            textBox1.Text,
                            board.Id,
                            CreateSolutionSteps()),
                        "AddSolution_V04",
                        60);
                    MessageBox.Show($"方案已添加: {planName}", "提示");
                }
            }
            catch (RpcBusyException ex)
            {
                MessageBox.Show(ex.Message, "系统繁忙", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
            catch (TimeoutException ex)
            {
                MessageBox.Show($"添加方案超时: {ex.Message}\r\n已尝试自动重建连接，请稍后重试。", "调用超时", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"添加方案失败: {ex.Message}", "错误");
            }
        }

        private static List<SolutionStepBase_V04> CreateSolutionSteps()
        {
            return new List<SolutionStepBase_V04>
            {
                new LoadTipsStep_V04
                {
                    DisplayName = "T1",
                    Position = "1",
                    Row = "1",
                    Col = "1",
                    AxisType = AxisCode.Axis1,
                    Tips = TipsType_V04.Tips1,
                    XOffset = 0,
                    YOffset = 0,
                    ZOffset = 0,
                    XSpeed = 0,
                    YSpeed = 0,
                    ZSpeed = 0,
                    ZCompleteZLiftSpeed = 0,
                    ZLoadSpeed = 0,
                },
                new AspirateStep_V04
                {
                    DisplayName = "T2",
                    Position = "2",
                    Row = "1",
                    Col = "1",
                    AxisType = AxisCode.Axis1,
                    Tips = TipsType_V04.Tips1,
                    XOffset = 0,
                    YOffset = 0,
                    ZOffset = 0,
                    ZStartPointOffsetHeight = 0,
                    XSpeed = 0,
                    YSpeed = 0,
                    ZSpeed = 0,
                    ZCompleteZLiftSpeed = 0,
                    LiquidLevelHeight = "0",
                    AspirateVolume = "10",
                    ReverseImbibing = 0,
                    PostAirVolume = 0,
                    MoisteningNumber = 0,
                    BlowingVolume = 0,
                    SuctionMethod = AspirateMethod_V04.None,
                    Hover = 0,
                    HoverBelowLiquidLevel = 0,
                    SuctionSpeed = 0,
                    SuctionToPostSuctionSpeed = 0,
                    SuctionToPostSuctionDuration = 0,
                },
                new DispenseStep_V04
                {
                    DisplayName = "T3",
                    Position = "3",
                    Row = "1",
                    Col = "1",
                    AxisType = AxisCode.Axis1,
                    Tips = TipsType_V04.Tips1,
                    XOffset = 0,
                    YOffset = 0,
                    ZOffset = 0,
                    ZStartPointOffsetHeight = 0,
                    XSpeed = 0,
                    YSpeed = 0,
                    ZSpeed = 0,
                    ZCompleteZLiftSpeed = 0,
                    DispenseVolume = "10",
                    DispensingMethod = DispenseMethod_V04.DiveToBottom,
                    DispenseSpeed = 0,
                    PostDischargePauseTimeMs = 0,
                    BlowVolume = 0,
                    AirSuckVolume = 0,
                    HoverBelowLiquidLevel = 0,
                    MixingTimes = 0,
                    MixingSpeed = 0,
                    MixingHoverBelowLiquidLevel = 0,
                },
                new MixStep_V04
                {
                    DisplayName = "T4",
                    Position = "4",
                    Row = "1",
                    Col = "1",
                    AxisType = AxisCode.Axis1,
                    Tips = TipsType_V04.Tips1,
                    XOffset = 0,
                    YOffset = 0,
                    ZOffset = 0,
                    ZStartPointOffsetHeight = 0,
                    XSpeed = 0,
                    YSpeed = 0,
                    ZSpeed = 0,
                    MixLoopVolume = 10,
                    MixLoopCounts = 10,
                    BlowSampleVolume = 0,
                    SuctionSpeed = 0,
                    DispenseSpeed = 0,
                    PostAirVolume = "0",
                    MixAfterAspirate = "0",
                },
                new UnloadTipsStep_V04
                {
                    DisplayName = "T5",
                    Position = "5",
                    Row = "1",
                    Col = "1",
                    AxisType = AxisCode.Axis1,
                    Tips = TipsType_V04.Tips1,
                    XOffset = 0,
                    YOffset = 0,
                    ZOffset = 0,
                    XSpeed = 0,
                    YSpeed = 0,
                    ZSpeed = 0,
                    ZCompleteZLiftSpeed = 0,
                    PostLoadPosition = ZLocationEnum_V04.None,
                },
                new TempSetStep_V04
                {
                    Number = 1,
                    Temp = 37,
                    Time = 100,
                    IsWait = true,
                },
                new TempAndOscStep_V04
                {
                    Number = 1,
                    Temp = 37,
                    OscRate = 1200,
                    Time = 100,
                    IsWait = true,
                },
                new OscSetStep_V04
                {
                    Number = 1,
                    OscRate = 1200,
                    OscTime = 100,
                    IsWait = true,
                },
                new MagneticStandStep_V04
                {
                    Number = 1,
                    Height = 35,
                    Time = 100,
                    IsWait = true,
                },
                new LiquidCoolSetStep_V04
                {
                    Number = 1,
                    Temp = 0,
                },
                new PauseStep_V04
                {
                    PauseEnum = PauseEnum_V04.Manual,
                    Remarks = "流程暂停，请点击确认后继续",
                },
                new MvKitStep_V04
                {
                    Source = 10,
                    Destination = 12,
                    PinchItUpPosition = 1,
                    PutDownPosition = 1,
                    Force = 5,
                },
            };
        }
        private List<Board>? _boards;
        private List<WorkTabletMatrix>? _matrices;

        /// <summary>
        /// 构造 V03 方案步骤（List&lt;StepData&gt;）。
        /// 对应 V03 服务端 SolutionProxy.AddSolution 的字段映射：
        /// StepAxis→Axis、Function→ActOn、DosageNum→Dosage、PlateNo→Number、
        /// PlateOrHoleNum→Place、BlendingTimes→MixCount、AssistFun1~5→辅助参数、
        /// HoleNumbers→HoleCollective、BalanceHeight→HeightFromBottom、DosageSpeed→ImbSpeed、Hierarchy→ZPos。
        /// </summary>
        private static List<StepData> CreateV03Steps()
        {
            return new List<StepData>
            {
                // 吸液：左臂，1号板 T2 位第 1 行第 1 列，吸液 10μL
                new StepData
                {
                    Function = MajorFun.Load,        // 动作：吸液
                    StepAxis = AxisNum.Left,             // 机械臂：左臂
                    PlateNo = 1,                         // 板位编号
                    PlateOrHoleNum = "T1",               // 板位名称（Place）
                    HoleRow = 1,                         // 孔位行
                    HoleCol = 1,                         // 孔位列
                    HoleNumbers = "1",                   // 孔号集合（HoleCollective）
                    BalanceHeight = 2,                   // 离底高度
                    XOffset = 0,
                    YOffset = 0,
                    ZOffset = 0,
                },
                // 吸液：左臂，1号板 T2 位第 1 行第 1 列，吸液 10μL
                new StepData
                {
                    Function = MajorFun.Imbibing,        // 动作：吸液
                    StepAxis = AxisNum.Left,             // 机械臂：左臂
                    PlateNo = 1,                         // 板位编号
                    PlateOrHoleNum = "T2",               // 板位名称（Place）
                    HoleRow = 1,                         // 孔位行
                    HoleCol = 1,                         // 孔位列
                    DosageNum = 10,                      // 液量（Dosage）
                    DosageSpeed = 10,                    // 吸液速度（服务端上限 10）
                    HoleNumbers = "1",                   // 孔号集合（HoleCollective）
                    BalanceHeight = 2,                   // 离底高度
                    XOffset = 0,
                    YOffset = 0,
                    ZOffset = 0,
                },
                // 分液：右臂，1 号板 T3 位，分液 10μL
                new StepData
                {
                    Function = MajorFun.Tapping,         // 动作：分液
                    StepAxis = AxisNum.Right,            // 机械臂：右臂
                    PlateNo = 1,
                    PlateOrHoleNum = "T4",
                    HoleRow = 1,
                    HoleCol = 1,
                    DosageNum = 10,
                    DosageSpeed = 10,
                    HoleNumbers = "1",
                    BalanceHeight = 2,
                    LiquidDispensingMethod = LiquidDispensingMethodEnum.NormalDispense,
                },
                // 混匀：1 号板 T4 位，混匀 10 次
                new StepData
                {
                    Function = MajorFun.Blending,        // 动作：混匀
                    StepAxis = AxisNum.Left,
                    PlateNo = 1,
                    PlateOrHoleNum = "T4",
                    HoleRow = 1,
                    HoleCol = 1,
                    DosageNum = 10,
                    BlendingTimes = 5,                  // 混匀次数（MixCount）
                    HoleNumbers = "1",
                },
                // 混匀：1 号板 T4 位，混匀 10 次
                new StepData
                {
                    Function = MajorFun.UnLoad,        // 动作：卸载
                    StepAxis = AxisNum.Left,
                    PlateNo = 1,
                    PlateOrHoleNum = "T6",
                    HoleRow = 1,
                    HoleCol = 1,
                    HoleNumbers = "1",
                },
            };
        }

        private void button10_Click(object sender, EventArgs e)
        {
            if (matrix == null)
            {
                ShowBoardsTree(null, "请先连接");
                return;
            }
            if (IsV03)
            {
                // V03：获取版位组合列表
                _matrices = SafeCall(() => matrix.GetWorkTabletMatrices(), "GetWorkTabletMatrices");
                if (_matrices == null) return;
                ShowBoardsTree(_matrices, null);
            }
            else
            {
                // V04：获取板位布局列表
                _boards = SafeCall(() => matrix.GetWorkTabletMatrices_V04(), "GetWorkTabletMatrices_V04");
                if (_boards == null) return;
                ShowBoardsTree(_boards, null);
            }
        }

        private void ShowBoardsTree(object? boards, string? message)
        {
            treeViewBoards.BeginUpdate();
            treeViewBoards.Nodes.Clear();

            if (!string.IsNullOrEmpty(message))
            {
                treeViewBoards.Nodes.Add(message);
                treeViewBoards.EndUpdate();
                return;
            }

            if (boards is not System.Collections.IEnumerable enumerable)
            {
                treeViewBoards.Nodes.Add("(无布局数据)");
                treeViewBoards.EndUpdate();
                return;
            }

            var index = 0;
            foreach (var item in enumerable)
            {
                var title = item switch
                {
                    Board b => $"Board[{index}] {b.Name ?? b.Id}",
                    WorkTabletMatrix m => $"Matrix[{index}] {m.MatrixName ?? m.MatrixId}",
                    _ => $"Item[{index}]",
                };
                var node = treeViewBoards.Nodes.Add(title);
                node.Tag = item; // 记录节点对应的布局对象，供添加方案时取选中项
                AppendObjectNodes(node, item, new HashSet<object>());
                node.Expand();
                index++;
            }

            if (index == 0)
            {
                treeViewBoards.Nodes.Add("(无布局数据)");
            }

            treeViewBoards.EndUpdate();
        }

        private static void AppendObjectNodes(TreeNode parent, object? value, HashSet<object> visited, string? label = null)
        {
            if (value == null)
            {
                parent.Nodes.Add($"{label ?? "值"}: (null)");
                return;
            }

            if (value is string or char or bool or byte or sbyte or short or ushort
                or int or uint or long or ulong or float or double or decimal
                or DateTime or DateTimeOffset or Guid or Enum)
            {
                parent.Nodes.Add($"{label ?? "值"}: {value}");
                return;
            }

            if (visited.Contains(value))
            {
                parent.Nodes.Add($"{label ?? "值"}: (循环引用)");
                return;
            }

            visited.Add(value);

            if (value is System.Collections.IEnumerable enumerable)
            {
                var groupNode = label == null ? parent : parent.Nodes.Add(label);
                var index = 0;
                foreach (var item in enumerable)
                {
                    var itemNode = groupNode.Nodes.Add($"[{index}]");
                    AppendObjectNodes(itemNode, item, visited);
                    index++;
                }
                if (index == 0)
                {
                    groupNode.Nodes.Add("(空)");
                }
                if (label != null)
                {
                    groupNode.Expand();
                }
                visited.Remove(value);
                return;
            }

            var objectNode = label == null ? parent : parent.Nodes.Add(label);
            foreach (var prop in value.GetType().GetProperties(BindingFlags.Public | BindingFlags.Instance))
            {
                if (!prop.CanRead || prop.GetIndexParameters().Length > 0)
                {
                    continue;
                }

                object? propValue;
                try
                {
                    propValue = prop.GetValue(value);
                }
                catch
                {
                    objectNode.Nodes.Add($"{prop.Name}: (读取失败)");
                    continue;
                }

                AppendObjectNodes(objectNode, propValue, visited, prop.Name);
            }

            if (label != null)
            {
                objectNode.Expand();
            }

            visited.Remove(value);
        }

        private void button11_Click(object sender, EventArgs e)
        {
            if (IsV03)
            {
                MessageBox.Show("V03 的位置修改需在设备端进行（UpdatePipettingPosition/UpdateClampJawPosition 依赖设备本机配置），Demo 不支持。", "提示");
                return;
            }
            if (_boards != null)
            {
                var board = _boards.First();
                board.Details.ToList().ForEach(x =>
                {
                    if (x.PipettingPosList != null)
                    {
                        foreach (var item in x.PipettingPosList)
                        {
                            item.xPosition = 1;
                            item.yPosition = 2;
                            item.bottleMouthPosition = 3;
                        }
                    }
                    if (x.gripperPos != null)
                    {
                        x.gripperPos.xPosition = 10;
                    }
                });
                var result = SafeCall(() => matrix!.UpdatePosition_V04(board), "UpdatePosition_V04");
            }
        }

        private void button12_Click(object sender, EventArgs e)
        {
            if (IsV03)
            {
                MessageBox.Show("V03 的版位组合添加需在设备端进行（AddWorkTabletMatrix 依赖设备本机底板/耗材配置），Demo 不支持。", "提示");
                return;
            }
            Board board = new Board()
            {
                Name = "SC9320",
                DeviceType = DeviceType.SC9320,
                Rows = 4,
                Columns = 7,
                Details = new(),
            };
            var index = 0;
            for (int r = 0; r < 4; r++)
            {
                for (int c = 0; c < 7; c++)
                {
                    if (r >= 1 && c < 3)
                    {
                        continue;
                    }
                    index += 1;
                    var detailId = Guid.NewGuid().ToString();
                    string name = "T" + index.ToString();
                    board.Details.Add(new BoardDetail
                    {
                        Id = detailId,
                        Number = index,
                        BoardId = board.Id,
                        Column = c,
                        ColumnSpan = 1,
                        Name = name,
                        Row = r,
                        RowSpan = index <= 3 ? 4 : 1,
                        Position = new BoardPosition()
                        {
                            BoardDetailId = detailId,
                            BoardName = name,
                            BoardNumber = index,
                        },
                        PipettingPosList = new List<PipettingPos>()
                        {
                            new PipettingPos
                            {
                                BoardDetailId = detailId,
                                AxisEnum = Prcxi.Lilith.Model.AxisCode.Axis1,
                                VolumeEnum  = MaterialVolumeEnum.Milli1000Pipette,
                                xPosition = 1000,
                            },
                            new PipettingPos
                            {
                                BoardDetailId = detailId,
                                AxisEnum = Prcxi.Lilith.Model.AxisCode.Axis2,
                                VolumeEnum  = MaterialVolumeEnum.Pico10Pipette,
                                xPosition = 10,
                            },
                            new PipettingPos
                            {
                                BoardDetailId = detailId,
                                AxisEnum = Prcxi.Lilith.Model.AxisCode.Axis2,
                                VolumeEnum  = MaterialVolumeEnum.Milli1000Pipette,
                                xPosition = 1000,
                            }
                        },
                        gripperPos = new GripperPos
                        {
                            BoardDetailId = detailId,
                            xPosition = 10,
                        },
                    });
                }
            }
            var result = SafeCall(() => matrix!.AddWorkTabletMatrix_V04(board), "AddWorkTabletMatrix_V04");
        }

        private void button13_Click(object sender, EventArgs e)
        {
            if (matrix == null)
            {
                ShowBoardsTree(null, "请先连接");
                return;
            }
            if (IsV03)
            {
                // V03：按版位组合 Id 删除
                if (_matrices == null || _matrices.Count == 0)
                {
                    ShowBoardsTree(null, "请先获取布局");
                    return;
                }
                SafeCall(() => matrix!.RemoveWorkTabletMatrix(_matrices.First().MatrixId), "RemoveWorkTabletMatrix");

                _matrices = SafeCall(() => matrix!.GetWorkTabletMatrices(), "GetWorkTabletMatrices");
                if (_matrices == null) return;
                ShowBoardsTree(_matrices, null);
            }
            else
            {
                if (_boards == null || _boards.Count == 0)
                {
                    ShowBoardsTree(null, "请先获取布局");
                    return;
                }
                SafeCall(() => matrix!.RemoveWorkTabletMatrix_V04(_boards.First().Id), "RemoveWorkTabletMatrix_V04");

                _boards = SafeCall(() => matrix!.GetWorkTabletMatrices_V04(), "GetWorkTabletMatrices_V04");
                if (_boards == null) return;
                ShowBoardsTree(_boards, null);
            }
        }

        private void button14_Click(object sender, EventArgs e)
        {
            var resetStatus = SafeCall(() => automation!.GetResetStatus(), "GetResetStatus");
            ShowBoardsTree(null, resetStatus.ToString());
        }
    }
}
