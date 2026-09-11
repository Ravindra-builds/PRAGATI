import React from 'react'
import { ProjectDetailView } from '@/components/project-detail/ProjectDetailView'

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params

  return <ProjectDetailView projectId={projectId} />
}
