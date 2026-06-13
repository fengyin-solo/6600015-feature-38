import { useState } from 'react'
import { Layout, Tabs, Statistic, Row, Col, Card, Tag, Button, Input, Table, Drawer, Descriptions, Space, Progress } from 'antd'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'
import { useTaskStore } from '../store/tasks'
import type { Task, TaskStatus } from '../types'

const { Header, Content } = Layout

const STATUS_COLORS: Record<TaskStatus, string> = {
  pending: 'default', running: 'processing', success: 'success', failed: 'error', retry: 'warning'
}

export default function Dashboard() {
  const store = useTaskStore()
  const [newTaskName, setNewTaskName] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [latencyDrawerOpen, setLatencyDrawerOpen] = useState(false)

  const taskColumns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 100 },
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: '状态', dataIndex: 'status', key: 'status', render: (s: TaskStatus) => <Tag color={STATUS_COLORS[s]}>{s}</Tag> },
    { title: '节点', dataIndex: 'node', key: 'node' },
    { title: '重试', key: 'retries', render: (_: any, r: Task) => `${r.retries}/${r.maxRetries}` },
    { title: '耗时', key: 'duration', render: (_: any, r: Task) => r.duration ? `${(r.duration / 1000).toFixed(1)}s` : '-' },
    { title: '操作', key: 'actions', render: (_: any, r: Task) => (
      <Space>
        {r.status === 'failed' && <Button size="small" type="primary" onClick={() => store.retryTask(r.id)}>重试</Button>}
        {r.status === 'running' && <Button size="small" danger onClick={() => store.cancelTask(r.id)}>取消</Button>}
        <Button size="small" onClick={() => { store.selectTask(r); setDrawerOpen(true) }}>详情</Button>
      </Space>
    )},
  ]

  const successCount = store.tasks.filter(t => t.status === 'success').length
  const failedCount = store.tasks.filter(t => t.status === 'failed').length
  const runningCount = store.tasks.filter(t => t.status === 'running').length

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <h1 style={{ color: 'white', margin: 0, fontSize: 18 }}>🔧 分布式任务调度与监控平台</h1>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <Input placeholder="任务名称" value={newTaskName} onChange={e => setNewTaskName(e.target.value)} style={{ width: 160 }} />
          <Button type="primary" onClick={() => { if (newTaskName) { store.addTask(newTaskName); setNewTaskName('') } }}>
            添加任务
          </Button>
        </div>
      </Header>
      <Content style={{ padding: 16 }}>
        {/* Stats */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}><Card><Statistic title="总任务" value={store.tasks.length} /></Card></Col>
          <Col span={6}><Card><Statistic title="运行中" value={runningCount} valueStyle={{ color: '#1890ff' }} /></Card></Col>
          <Col span={6}><Card><Statistic title="成功" value={successCount} valueStyle={{ color: '#52c41a' }} /></Card></Col>
          <Col span={6}><Card><Statistic title="失败" value={failedCount} valueStyle={{ color: '#ff4d4f' }} /></Card></Col>
        </Row>

        <Tabs items={[
          { key: 'metrics', label: '监控指标', children: (
            <Row gutter={16}>
              <Col span={12}>
                <Card title="运行中任务数">
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={store.metrics}>
                      <XAxis dataKey="time" tickFormatter={t => new Date(t).toLocaleTimeString()} fontSize={10} />
                      <YAxis fontSize={10} />
                      <Tooltip labelFormatter={t => new Date(t as number).toLocaleString()} />
                      <Area type="monotone" dataKey="runningTasks" stroke="#1890ff" fill="#1890ff" fillOpacity={0.3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </Card>
              </Col>
              <Col span={12}>
                <Card title="成功率 %">
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={store.metrics}>
                      <XAxis dataKey="time" tickFormatter={t => new Date(t).toLocaleTimeString()} fontSize={10} />
                      <YAxis domain={[0, 100]} fontSize={10} />
                      <Tooltip labelFormatter={t => new Date(t as number).toLocaleString()} />
                      <Line type="monotone" dataKey="successRate" stroke="#52c41a" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </Card>
              </Col>
              <Col span={24} style={{ marginTop: 16 }}>
                <Card
                  title="平均延迟 (ms)"
                  extra={<a onClick={() => setLatencyDrawerOpen(true)}>查看详情 →</a>}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setLatencyDrawerOpen(true)}
                >
                  <ResponsiveContainer width="100%" height={150}>
                    <AreaChart data={store.metrics}>
                      <defs>
                        <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#faad14" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#faad14" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="time" tickFormatter={t => new Date(t).toLocaleTimeString()} fontSize={10} />
                      <YAxis fontSize={10} />
                      <Tooltip
                        formatter={(value: number, name: string) => [
                          `${value.toFixed(0)} ms`,
                          name === 'avgLatency' ? '平均延迟' : name === 'minLatency' ? '最低延迟' : '最高延迟'
                        ]}
                        labelFormatter={t => new Date(t as number).toLocaleString()}
                      />
                      <Area type="monotone" dataKey="maxLatency" stroke="none" fill="url(#latencyGradient)" />
                      <Area type="monotone" dataKey="minLatency" stroke="none" fill="#fff" />
                      <Line type="monotone" dataKey="avgLatency" stroke="#faad14" strokeWidth={2} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </Card>
              </Col>
            </Row>
          )},
          { key: 'tasks', label: '任务列表', children: (
            <Table dataSource={store.tasks} columns={taskColumns} rowKey="id" size="small" pagination={{ pageSize: 10 }} />
          )},
          { key: 'nodes', label: '集群节点', children: (
            <Row gutter={16}>
              {store.nodes.map(node => (
                <Col span={8} key={node.id} style={{ marginBottom: 16 }}>
                  <Card title={<span>{node.type === 'scheduler' ? '🎯' : '⚙️'} {node.name}</span>}
                    extra={<Tag color={node.status === 'online' ? 'green' : node.status === 'overloaded' ? 'orange' : 'red'}>{node.status}</Tag>}>
                    <Progress percent={Math.round(node.cpu)} strokeColor={node.cpu > 80 ? '#ff4d4f' : '#1890ff'} format={v => `CPU ${v}%`} />
                    <Progress percent={Math.round(node.memory)} strokeColor={node.memory > 80 ? '#ff4d4f' : '#52c41a'} format={v => `MEM ${v}%`} />
                    <div style={{ marginTop: 8, fontSize: 12, color: '#888' }}>
                      任务数: {node.tasks} | 运行时间: {Math.floor(node.uptime / 3600)}h
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          )},
        ]} />

        {/* Task Detail Drawer */}
        <Drawer title="任务详情" open={drawerOpen} onClose={() => setDrawerOpen(false)} width={480}>
          {store.selectedTask && (
            <>
              <Descriptions column={1} bordered size="small">
                <Descriptions.Item label="ID">{store.selectedTask.id}</Descriptions.Item>
                <Descriptions.Item label="名称">{store.selectedTask.name}</Descriptions.Item>
                <Descriptions.Item label="状态"><Tag color={STATUS_COLORS[store.selectedTask.status]}>{store.selectedTask.status}</Tag></Descriptions.Item>
                <Descriptions.Item label="执行节点">{store.selectedTask.node}</Descriptions.Item>
                <Descriptions.Item label="重试次数">{store.selectedTask.retries}/{store.selectedTask.maxRetries}</Descriptions.Item>
                <Descriptions.Item label="创建时间">{new Date(store.selectedTask.createdAt).toLocaleString()}</Descriptions.Item>
                <Descriptions.Item label="耗时">{store.selectedTask.duration ? `${(store.selectedTask.duration / 1000).toFixed(1)}s` : '-'}</Descriptions.Item>
              </Descriptions>
              <h4 style={{ marginTop: 16 }}>执行日志</h4>
              <pre style={{ background: '#1f1f1f', padding: 12, borderRadius: 8, fontSize: 12, maxHeight: 300, overflow: 'auto' }}>
                {store.selectedTask.logs.join('\n')}
              </pre>
            </>
          )}
        </Drawer>

        {/* Latency Detail Drawer */}
        <Drawer
          title="延迟详情分析"
          open={latencyDrawerOpen}
          onClose={() => setLatencyDrawerOpen(false)}
          width={720}
        >
          {(() => {
            const latest = store.metrics[store.metrics.length - 1]
            const peak = [...store.metrics].reduce((a, b) => a.maxLatency > b.maxLatency ? a : b, store.metrics[0])
            const avgLatency = store.metrics.reduce((sum, m) => sum + m.avgLatency, 0) / store.metrics.length
            const minLatency = Math.min(...store.metrics.map(m => m.minLatency))
            const maxLatency = Math.max(...store.metrics.map(m => m.maxLatency))

            return (
              <>
                <Row gutter={16} style={{ marginBottom: 16 }}>
                  <Col span={8}>
                    <Card>
                      <Statistic
                        title="当前平均延迟"
                        value={latest?.avgLatency || 0}
                        precision={0}
                        suffix="ms"
                        valueStyle={{ color: '#faad14' }}
                      />
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card>
                      <Statistic
                        title="波动区间"
                        value={minLatency.toFixed(0)}
                        precision={0}
                        suffix={`ms ~ ${maxLatency.toFixed(0)} ms`}
                        valueStyle={{ color: '#1890ff' }}
                      />
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card>
                      <Statistic
                        title="峰值延迟"
                        value={peak?.maxLatency || 0}
                        precision={0}
                        suffix="ms"
                        valueStyle={{ color: '#ff4d4f' }}
                      />
                      <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                        发生于 {new Date(peak?.time || 0).toLocaleString()}
                      </div>
                    </Card>
                  </Col>
                </Row>

                <Card title="延迟波动趋势" style={{ marginBottom: 16 }}>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={store.metrics}>
                      <defs>
                        <linearGradient id="latencyRangeGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#faad14" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#faad14" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="time"
                        tickFormatter={t => new Date(t).toLocaleTimeString()}
                        fontSize={11}
                      />
                      <YAxis fontSize={11} />
                      <Tooltip
                        formatter={(value: number, name: string) => [
                          `${value.toFixed(0)} ms`,
                          name === 'avgLatency' ? '平均延迟' : name === 'minLatency' ? '最低延迟' : '最高延迟'
                        ]}
                        labelFormatter={t => new Date(t as number).toLocaleString()}
                      />
                      <Area
                        type="monotone"
                        dataKey="maxLatency"
                        stroke="none"
                        fill="url(#latencyRangeGradient)"
                        name="maxLatency"
                      />
                      <Area
                        type="monotone"
                        dataKey="minLatency"
                        stroke="none"
                        fill="#fff"
                        name="minLatency"
                      />
                      <Line
                        type="monotone"
                        dataKey="avgLatency"
                        stroke="#faad14"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 6 }}
                        name="avgLatency"
                      />
                      <Line
                        type="monotone"
                        dataKey="maxLatency"
                        stroke="#ff4d4f"
                        strokeWidth={1}
                        strokeDasharray="5 5"
                        dot={false}
                        name="maxLatency"
                      />
                      <Line
                        type="monotone"
                        dataKey="minLatency"
                        stroke="#52c41a"
                        strokeWidth={1}
                        strokeDasharray="5 5"
                        dot={false}
                        name="minLatency"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </Card>

                <Card title="统计摘要">
                  <Descriptions column={2} bordered size="small">
                    <Descriptions.Item label="时间段">
                      {store.metrics.length > 0
                        ? `${new Date(store.metrics[0].time).toLocaleString()} ~ ${new Date(store.metrics[store.metrics.length - 1].time).toLocaleString()}`
                        : '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="数据点数">{store.metrics.length}</Descriptions.Item>
                    <Descriptions.Item label="平均延迟">{avgLatency.toFixed(0)} ms</Descriptions.Item>
                    <Descriptions.Item label="延迟中位数">
                      {([...store.metrics].sort((a, b) => a.avgLatency - b.avgLatency)[Math.floor(store.metrics.length / 2)]?.avgLatency || 0).toFixed(0)} ms
                    </Descriptions.Item>
                    <Descriptions.Item label="最低延迟">{minLatency.toFixed(0)} ms</Descriptions.Item>
                    <Descriptions.Item label="最高延迟">{maxLatency.toFixed(0)} ms</Descriptions.Item>
                    <Descriptions.Item label="波动幅度">
                      {(maxLatency - minLatency).toFixed(0)} ms ({(((maxLatency - minLatency) / avgLatency) * 100).toFixed(1)}%)
                    </Descriptions.Item>
                    <Descriptions.Item label="峰值时刻">
                      {peak ? new Date(peak.time).toLocaleString() : '-'}
                    </Descriptions.Item>
                  </Descriptions>
                </Card>
              </>
            )
          })()}
        </Drawer>
      </Content>
    </Layout>
  )
}
