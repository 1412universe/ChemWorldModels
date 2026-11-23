using System;
using System.Threading;

namespace Demo_RPC_V04
{
    /// <summary>
    /// RPC 调用超时辅助类。
    /// 底层 Prcxi.NettyRPC（DotNettyRPC）客户端内部使用 AutoResetEvent.WaitOne() 无限等待，
    /// 没有超时机制；一旦服务端连接被关闭或长时间无响应，调用会永久阻塞、收不到返回值。
    /// 本类在调用示例层包装超时：超过指定秒数后抛出 TimeoutException，由调用方决定重连或放弃，
    /// 避免 UI 永久卡死。
    /// 注意：超时后底层调用线程仍可能阻塞在等待中（.NET 无法强制终止），因此：
    ///   1. 通过 <see cref="MaxPending"/> 熔断，限制同时挂起的请求数量，防止卡死线程无限堆积；
    ///   2. 超时时触发 <see cref="OnTimeout"/> 回调，由调用方重建连接以隔离已卡死的线程。
    /// </summary>
    public static class RpcTimeout
    {
        /// <summary>默认超时时间（秒）。服务端 SQLite 写事务最长约 30s，默认 30s 较为安全。</summary>
        public const int DefaultSeconds = 30;

        /// <summary>
        /// 最大同时挂起的请求数量（熔断阈值）。
        /// 超过此值直接抛 <see cref="RpcBusyException"/> 拒绝新调用，
        /// 从源头限制因底层 WaitOne() 卡死而泄漏的线程数量。
        /// </summary>
        public const int MaxPending = 6;

        /// <summary>
        /// 超时回调。当某次 RPC 调用超时时触发（可能并发触发，实现需保证线程安全）。
        /// 由调用方注入，典型用途是重建客户端连接以隔离已卡死的线程。
        /// </summary>
        public static Action? OnTimeout { get; set; }

        /// <summary>当前挂起（进行中）的请求数，原子计数。</summary>
        private static int _pending;

        /// <summary>
        /// 带超时执行一个返回值的 RPC 调用。
        /// 超时抛 <see cref="TimeoutException"/>；挂起数超过熔断阈值抛 <see cref="RpcBusyException"/>；
        /// RPC 内部异常保持原始类型抛出。
        /// </summary>
        public static T Call<T>(Func<T> rpcCall, string? operationName = null, int timeoutSeconds = DefaultSeconds)
        {
            ArgumentNullException.ThrowIfNull(rpcCall);

            TryEnter(operationName ?? rpcCall.Method.Name);
            try
            {
                var task = Task.Run(rpcCall);
                if (!task.Wait(TimeSpan.FromSeconds(timeoutSeconds)))
                {
                    OnTimeout?.Invoke();
                    throw new TimeoutException($"RPC 调用 {operationName ?? rpcCall.Method.Name} 超时（{timeoutSeconds}s），请检查服务端是否响应");
                }

                // 使用 GetAwaiter().GetResult() 抛原始异常，避免 AggregateException 包装
                return task.GetAwaiter().GetResult();
            }
            finally
            {
                Interlocked.Decrement(ref _pending);
            }
        }

        /// <summary>
        /// 带超时执行一个无返回值的 RPC 调用（如 Start/Stop/Reset）。
        /// 超时抛 <see cref="TimeoutException"/>；挂起数超过熔断阈值抛 <see cref="RpcBusyException"/>；
        /// RPC 内部异常保持原始类型抛出。
        /// </summary>
        public static void Call(Action rpcCall, string? operationName = null, int timeoutSeconds = DefaultSeconds)
        {
            ArgumentNullException.ThrowIfNull(rpcCall);

            TryEnter(operationName ?? "操作");
            try
            {
                var task = Task.Run(rpcCall);
                if (!task.Wait(TimeSpan.FromSeconds(timeoutSeconds)))
                {
                    OnTimeout?.Invoke();
                    throw new TimeoutException($"RPC 调用 {operationName ?? "操作"} 超时（{timeoutSeconds}s），请检查服务端是否响应");
                }

                task.GetAwaiter().GetResult();
            }
            finally
            {
                Interlocked.Decrement(ref _pending);
            }
        }

        /// <summary>
        /// 尝试进入一次调用。挂起数自增后若超过 <see cref="MaxPending"/> 则回退并抛 <see cref="RpcBusyException"/>。
        /// 调用方负责在 finally 中 <see cref="Interlocked.Decrement(ref _pending)"/>。
        /// </summary>
        private static void TryEnter(string operationName)
        {
            var current = Interlocked.Increment(ref _pending);
            if (current > MaxPending)
            {
                Interlocked.Decrement(ref _pending);
                throw new RpcBusyException(
                    $"RPC 调用 {operationName} 被拒绝：当前已有 {MaxPending} 个请求挂起（可能因服务端无响应导致线程占用），请稍后重试");
            }
        }
    }

    /// <summary>
    /// 熔断异常：当同时挂起的 RPC 请求数超过 <see cref="RpcTimeout.MaxPending"/> 时抛出。
    /// 表示当前系统已积压过多未完成的请求（通常是服务端无响应导致），应提示用户稍后重试。
    /// </summary>
    public sealed class RpcBusyException : Exception
    {
        public RpcBusyException(string message) : base(message) { }
    }
}
