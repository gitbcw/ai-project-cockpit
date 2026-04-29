import { NextResponse } from 'next/server';
import { readCockpitStateWithVersion, writeCockpitState } from '@/lib/db';
import type { CockpitStateSnapshot } from '@/types/cockpit';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { snapshot, version } = readCockpitStateWithVersion();
  return NextResponse.json({ ...snapshot, stateVersion: version });
}

export async function POST(request: Request) {
  const body = (await request.json()) as CockpitStateSnapshot & { stateVersion?: string };
  const { snapshot: current, version: currentVersion } = readCockpitStateWithVersion();
  const incoming = stripMeta(body);
  const shouldMerge = body.stateVersion && body.stateVersion !== currentVersion;
  const next = shouldMerge ? mergeSnapshots(current, incoming) : incoming;
  const version = writeCockpitState(next);
  return NextResponse.json({ ok: true, merged: !!shouldMerge, stateVersion: version, snapshot: next });
}

function stripMeta(snapshot: CockpitStateSnapshot & { stateVersion?: string }): CockpitStateSnapshot {
  return {
    projects: snapshot.projects,
    tasks: snapshot.tasks,
    contexts: snapshot.contexts,
    aiRecords: snapshot.aiRecords,
    decisions: snapshot.decisions,
    selectedProjectId: snapshot.selectedProjectId,
  };
}

function mergeSnapshots(current: CockpitStateSnapshot, incoming: CockpitStateSnapshot): CockpitStateSnapshot {
  return {
    projects: mergeById(current.projects, incoming.projects),
    tasks: mergeById(current.tasks, incoming.tasks),
    contexts: mergeById(current.contexts, incoming.contexts),
    aiRecords: mergeById(current.aiRecords, incoming.aiRecords),
    decisions: mergeById(current.decisions, incoming.decisions),
    selectedProjectId: incoming.selectedProjectId || current.selectedProjectId,
  };
}

function mergeById<T extends { id: string }>(current: T[], incoming: T[]) {
  const incomingIds = new Set(incoming.map((item) => item.id));
  return [...incoming, ...current.filter((item) => !incomingIds.has(item.id))];
}
