/**
 * Right now the file is doing barrel exports. But if something more
 * sophisticated is needed down the line, those changes should be handled in
 * this file, to provide some degree of insulation between the vendored files
 * and the rest of the plugin logic.
 */
export type * from './api/typesGenerated';
export {
  type DeleteWorkspaceOptions,
  type GetLicensesResponse,
  type InsightsParams,
  type InsightsTemplateParams,
  Api as CoderSdk,
} from './api/api';
