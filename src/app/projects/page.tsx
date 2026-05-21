'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useProjectStore, type Project } from '@/lib/project-store'
import { useTemplateStore } from '@/lib/template-store'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  FolderKanban, Plus, Pencil, Trash2, Play, FileText, Zap,
} from 'lucide-react'

export default function ProjectsPage() {
  const router = useRouter()
  const projects = useProjectStore((s) => s.projects)
  const addProject = useProjectStore((s) => s.addProject)
  const updateProject = useProjectStore((s) => s.updateProject)
  const removeProject = useProjectStore((s) => s.removeProject)
  const templates = useTemplateStore((s) => s.templates)

  const [hydrated, setHydrated] = useState(false)
  useEffect(() => setHydrated(true), [])

  const [showDialog, setShowDialog] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', description: '', templateIds: [] as string[] })

  function openNew() {
    setEditId(null)
    setForm({ name: '', description: '', templateIds: [] })
    setShowDialog(true)
  }

  function openEdit(p: Project) {
    setEditId(p.id)
    setForm({ name: p.name, description: p.description || '', templateIds: [...p.templateIds] })
    setShowDialog(true)
  }

  function toggleTemplate(id: string) {
    setForm((f) => ({
      ...f,
      templateIds: f.templateIds.includes(id)
        ? f.templateIds.filter((x) => x !== id)
        : [...f.templateIds, id],
    }))
  }

  function save() {
    if (!form.name.trim()) return alert('请输入项目名称')
    if (editId) {
      updateProject(editId, {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        templateIds: form.templateIds,
      })
    } else {
      addProject({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        templateIds: form.templateIds,
        fieldBindings: {},
      })
    }
    setShowDialog(false)
  }

  function del(id: string) {
    if (!confirm('确认删除该项目？')) return
    removeProject(id)
  }

  if (!hydrated) return <div className="p-8 text-gray-400">加载中...</div>

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FolderKanban className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-semibold text-gray-900">项目管理</h1>
          <Badge variant="secondary" className="text-xs">{projects.length} 个项目</Badge>
        </div>
        <Button onClick={openNew}>
          <Plus className="w-4 h-4 mr-1" /> 新建项目
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((p) => {
          const tpls = p.templateIds
            .map((tid) => templates.find((t) => t.id === tid))
            .filter(Boolean)
          return (
            <Card key={p.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                      <FolderKanban className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{p.name}</CardTitle>
                      {p.description && (
                        <p className="text-xs text-gray-500 mt-0.5">{p.description}</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-1">
                  {tpls.map((t) => (
                    <Badge
                      key={t!.id}
                      variant="outline"
                      className={
                        'text-[10px] ' +
                        (t!.type === 'similarity'
                          ? 'border-amber-300 text-amber-700 bg-amber-50'
                          : 'border-blue-300 text-blue-700 bg-blue-50')
                      }
                    >
                      {t!.type === 'similarity' ? (
                        <Zap className="w-3 h-3 mr-0.5" />
                      ) : (
                        <FileText className="w-3 h-3 mr-0.5" />
                      )}
                      {t!.name}
                    </Badge>
                  ))}
                  {tpls.length === 0 && (
                    <span className="text-xs text-gray-400">暂无模板</span>
                  )}
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => router.push('/eval/new?projectId=' + p.id)}
                  >
                    <Play className="w-3.5 h-3.5 mr-1" /> 运行
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openEdit(p)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => del(p.id)}>
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {projects.length === 0 && (
        <div className="text-center py-16 text-gray-400 text-sm">
          暂无项目，点击右上角「新建项目」创建
        </div>
      )}

      {/* 新建/编辑对话框 */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? '编辑项目' : '新建项目'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-gray-600">项目名称</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="例如：Rubric 质量审核"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-600">描述（可选）</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="简要说明项目用途"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-600">选择模板（可多选）</Label>
              <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
                {templates.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => toggleTemplate(t.id)}
                    className={
                      'border rounded-lg p-2.5 cursor-pointer transition-all text-sm ' +
                      (form.templateIds.includes(t.id)
                        ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-200'
                        : 'border-gray-200 hover:border-gray-300')
                    }
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={form.templateIds.includes(t.id)}
                          onChange={() => toggleTemplate(t.id)}
                          className="rounded"
                        />
                        <span className="font-medium">{t.name}</span>
                        <Badge variant="outline" className="text-[9px]">
                          {t.type === 'similarity' ? '相似度' : 'LLM'}
                        </Badge>
                      </div>
                    </div>
                    {t.description && (
                      <p className="text-xs text-gray-500 mt-1 ml-6">{t.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>取消</Button>
            <Button onClick={save}>{editId ? '保存' : '创建'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
