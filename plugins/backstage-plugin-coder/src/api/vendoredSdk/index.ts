export type * from './api/typesGenerated';
export type {
  DeleteWorkspaceOptions,
  GetLicensesResponse,
  InsightsParams,
  InsightsTemplateParams,
} from './api/api';
import { Api } from './api/api';

// Union of all API properties that won't ever be relevant to Backstage users.
// Not a huge deal that they still exist at runtime; mainly concerned about
// whether they pollute Intellisense when someone is using the SDK. Most of
// these properties don't deal with APIs and are mainly helpers in Core
type PropertyToHide =
  | 'getJFrogXRayScan'
  | 'getCsrfToken'
  | 'setSessionToken'
  | 'setHost'
  | 'getAvailableExperiments'
  | 'login'
  | 'logout';

// Wanted to have a CoderSdk class (mainly re-exporting the Api class as itself
// with the extra properties omitted). But because classes are wonky and exist
// as both runtime values and times, it didn't seem possible, even with things
// like class declarations. Making a new function is good enough for now, though
export type CoderSdk = Omit<Api, PropertyToHide>;
export function makeCoderSdk(): CoderSdk {
  const api = new Api();
  return api as CoderSdk;
}
