import parse from 'git-url-parse';

/**
 * Given a repository URL, figure out the base repository.
 */
export function parseGitUrl(url: string): String {
  const parsed = parse(url);
  // Although it seems to have a `host` property, it is not on the types, so we
  // will have to reconstruct it.
  const host = parsed.resource + (parsed.port ? `:${parsed.port}` : '');
  return `${parsed.protocol}://${host}/${parsed.full_name}`;
}
