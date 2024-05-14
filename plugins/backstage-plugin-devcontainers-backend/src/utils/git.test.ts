import { parseGitUrl } from './git';

describe('git', () => {
  it('parses urls', () => {
    // List of forges and the various ways URLs can be formed.
    const forges = {
      github: {
        saas: 'github.com',
        paths: [
          '/tree/foo',
          '/blob/foo',
          '/tree/foo/dir',
          '/blob/foo/dir/file.ts',
        ],
      },
      gitlab: {
        saas: 'gitlab.com',
        paths: [
          '/-/tree/foo',
          '/-/blob/foo',
          '/-/tree/foo/dir?ref_type=heads',
          '/-/blob/foo/dir/file.ts?ref_type=heads',
        ],
      },
      bitbucket: {
        saas: 'bitbucket.org',
        paths: [
          '/src/hashOrTag',
          '/src/hashOrTag?at=foo',
          '/src/hashOrTag/dir',
          '/src/hashOrTag/dir?at=foo',
          '/src/hashOrTag/dir/file.ts',
          '/src/hashOrTag/dir/file.ts?at=foo',
        ],
      },
    };

    for (const [forge, test] of Object.entries(forges)) {
      // These are URLs that point to the root of the repository.  To these we
      // append the above paths to test that the original root URL is extracted.
      const baseUrls = [
        // Most common format.
        `https://${test.saas}/coder/backstage-plugins`,
        // GitLab lets you have a sub-group.
        `https://${test.saas}/coder/group/backstage-plugins`,
        // Self-hosted.
        `https://${forge}.coder.com/coder/backstage-plugins`,
        // Self-hosted at a port.
        `https://${forge}.coder.com:9999/coder/backstage-plugins`,
        // Self-hosted at base path.
        `https://${forge}.coder.com/base/path/coder/backstage-plugins`,
        // Self-hosted without the forge anywhere in the domain.
        'https://coder.com/coder/backstage-plugins',
      ];
      for (const baseUrl of baseUrls) {
        expect(parseGitUrl(baseUrl)).toEqual(baseUrl);
        for (const path of test.paths) {
          const url = `${baseUrl}${path}`;
          expect(parseGitUrl(url)).toEqual(baseUrl);
        }
      }
    }
  });
});
