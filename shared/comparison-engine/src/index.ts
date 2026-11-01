export * from './types.ts';
export { buildSnapshot, verifySnapshot, formatValue, canonicalJson, ENGINE_VERSION } from './engine.ts';
export { recommend, profileVerdicts, DEFAULT_WEIGHTS, PROFILE_WEIGHTS } from './recommend.ts';
export { defaultRegistry } from './registry.ts';
export { toDashboard } from './adapters/dashboard.ts';
export { toStoryboard, validateStoryboard, assertRenderable } from './adapters/video.ts';
export type { Storyboard, Scene, Fact, ValidationIssue } from './adapters/video.ts';
export { createComparisonService } from './service.ts';
export type { SnapshotStore } from './service.ts';
