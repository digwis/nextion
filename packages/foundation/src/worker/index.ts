// Public surface for the @vinext/foundation/worker subpath.
//
// Re-exports the Cloudflare Worker bootstrap plus the supporting
// types the starter's `worker/index.ts` needs to construct one.

export {
  createFoundationWorker,
  healthRoute,
  healthRouteHandle,
  type FoundationExtraRouteHandler,
  type FoundationWorker,
  type FoundationWorkerOptions,
} from "./bootstrap";
