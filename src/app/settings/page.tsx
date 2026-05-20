'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useConfigStore, ApiConfig } from '@/lib/config-store'
import { testConnection } from '@/lib/llm-client'
import { Loader2, CheckCircle2, XCircle, Plus, Trash2, Star } from 'lucide-react'

export default function SettingsPage() {
  const { configs, activeConfigId, addConfig, updateConfig, removeConfig, setActiveConfig } = useConfigStore()
  const [testing, setTesting] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean; msg: string }>>({})

  const handleTest = async (config: ApiConfig) => {
    setTesting(config.id)
    const result = await testConnection(config)
    setTestResults(prev => ({ ...prev, [config.id]: result }))
    setTesting(null)
  }

  const handleAdd = () => {
    addConfig({
      name: `API 配置 ${configs.length + 1}`,
      apiUrl: '',
      apiKey: '',
      model: '',
      concurrency: 20,
    })
  }

  return (
    <>
      <Header title="系统设置" />
      <div className="p-6 max-w-3xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">模型 API 配置</h2>
          <Button onClick={handleAdd} size="sm">
            <Plus className="w-4 h-4 mr-1" />
            新增配置
          </Button>
        </div>
        <p className="text-sm text-gray-500">
          可配置多个 API，点击「设为默认」选择当前使用的配置。执行审核任务时将使用默认配置。
        </p>

        {configs.map((config) => {
          const isActive = config.id === activeConfigId
          const testResult = testResults[config.id]
          return (
            <Card key={config.id} className={isActive ? 'border-blue-300 ring-1 ring-blue-200' : ''}>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div className="flex items-center gap-2">
                  {isActive && <Star className="w-4 h-4 text-blue-500 fill-blue-500" />}
                  <Input
                    value={config.name}
                    onChange={e => updateConfig(config.id, { name: e.target.value })}
                    className="font-semibold border-0 p-0 h-auto text-base shadow-none focus-visible:ring-0"
                    placeholder="配置名称"
                  />
                </div>
                <div className="flex items-center gap-2">
                  {isActive ? (
                    <Badge className="bg-blue-100 text-blue-700">当前使用</Badge>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => setActiveConfig(config.id)}>
                      设为默认
                    </Button>
                  )}
                  {configs.length > 1 && (
                    <Button variant="ghost" size="sm" onClick={() => removeConfig(config.id)} className="text-red-500 hover:text-red-700">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-500">API URL</Label>
                    <Input
                      value={config.apiUrl}
                      onChange={e => updateConfig(config.id, { apiUrl: e.target.value })}
                      placeholder="https://..."
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-500">API Key</Label>
                    <Input
                      type="password"
                      value={config.apiKey}
                      onChange={e => updateConfig(config.id, { apiKey: e.target.value })}
                      placeholder="sk-..."
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-500">模型名称</Label>
                    <Input
                      value={config.model}
                      onChange={e => updateConfig(config.id, { model: e.target.value })}
                      placeholder="claude-sonnet-4-6-20260217"
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-500">并发数</Label>
                    <Input
                      type="number"
                      value={config.concurrency}
                      onChange={e => updateConfig(config.id, { concurrency: parseInt(e.target.value) || 10 })}
                      min={1}
                      max={200}
                      className="text-sm"
                    />
                  </div>
                </div>

                <Separator />

                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTest(config)}
                    disabled={testing === config.id || !config.apiUrl || !config.apiKey}
                  >
                    {testing === config.id && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                    测试连接
                  </Button>
                  {testResult && (
                    <div className={`flex items-center gap-1 text-xs ${testResult.ok ? 'text-green-600' : 'text-red-600'}`}>
                      {testResult.ok ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {testResult.msg}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </>
  )
}
