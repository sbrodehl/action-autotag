# Action AutoTag

This action will read a chosen source file and extract the current version from it. It will then compare it to the project's known tags and, if a corresponding tag does not exist, it will be created.

Forked from [General AutoTag](https://github.com/Jaliborc/action-general-autotag), forked from [Autotag](https://github.com/ButlerLogic/action-autotag), which worked specifically with Node projects.
This approach is more flexible and works with different programming languages.

## Usage

The following is an example `.github/workflows/main.yml` that will execute when a `push` to the `main` branch occurs.
It will extract the current version number from `package.json`:

```yaml
name: AutoTag Workflow

on:
  push:
    paths:
    - package.json
    branches:
    - main

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@master
    - uses: sbrodehl/action-autotag@v2.0.0
      with:
        GITHUB_TOKEN: "${{ secrets.GITHUB_TOKEN }}"
        # this example uses the semver regex https://semver.org/#is-there-a-suggested-regular-expression-regex-to-check-a-semver-string
        # with a capture group (around everything), but all other groups are non capturing, double escape's where necessary
        extraction_regex: "\"version\"\\s*:\\s*[\\'\"]((?:0|[1-9]\\d*)\\.(?:0|[1-9]\\d*)\\.(?:0|[1-9]\\d*)(?:-(?:(?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\\.(?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\\+(?:[0-9a-zA-Z-]+(?:\\.[0-9a-zA-Z-]+)*))?)[\\'\"]"
        capture_group: 1
        source_file: "package.json"
```

To make this work, the workflow must have the checkout action _before_ the tagging action.
Otherwise, the action is unable to find the source file.

## Configuration
### Mandatory

The `GITHUB_TOKEN`, a `source_file` and an `extraction_regex` must be passed in.
Without this, it is not possible to create a new tag.
Make sure the autotag action looks like the following example:

```yaml
- uses: sbrodehl/action-autotag@v2.0.0
  with:
    GITHUB_TOKEN: "${{ secrets.GITHUB_TOKEN }}"
    source_file: # the file in your repository that contains the version name
    extraction_regex: # some regex pattern
```

The action will automatically extract the github token at runtime.
**DO NOT MANUALLY ENTER YOUR TOKEN.** If you put the actual token in your workflow file, you're make it accessible in plaintext to anyone who ever views the repository (it will be in your git history).

### Optional
There are a few options to customize how the tag is created.

1. `tag_format`

    By default, the action will tag versions exactly as matched in the source file. Prefixes and suffixes can be used to add text around the tag name. For example, if the current version is `1.0.0` and the `tag_format` is set to `v{version} (beta)`, then the tag would be labeled as `v1.0.0 (beta)`.

    ```yaml
    - uses: sbrodehl/action-autotag@v2.0.0
      with:
        GITHUB_TOKEN: "${{ secrets.GITHUB_TOKEN }}"
        source_file: "package.json"
        extraction_regex: "(\\d+\\.\\d+\\.\\d+)"
        tag_format: "v{version} (beta)"
    ```

1. `tag_message`

    This is the annotated commit message associated with the tag. By default, a changelog will be generated from the commits between the latest tag and the new tag (HEAD). This will override that with a hard-coded message.

    ```yaml
    - uses: sbrodehl/action-autotag@v2.0.0
      with:
        GITHUB_TOKEN: "${{ secrets.GITHUB_TOKEN }}"
        source_file: "project.toc"
        extraction_regex: "Version:\\s*(\\d+)"
        tag_message: "Custom message goes here."
    ```

## Output
If you are building an action that runs after this one, be aware this action produces several [outputs](https://help.github.com/en/articles/metadata-syntax-for-github-actions#outputs):

1. `tagname` will be empty if no tag was created, or it will be the value of the new tag.
1. `tagsha`: The SHA of the new tag.
1. `taguri`: The URI/URL of the new tag reference.
1. `tagmessage`: The message applied to the tag reference (this is what shows up on the tag screen on GitHub).
1. `version` will be the version attribute found in the chosen source file.
