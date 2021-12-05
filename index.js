const github = require('@actions/github')
const core = require('@actions/core')
const path = require('path')
const fs = require('fs')

async function run() {
  try {
    const context = github.context;

    let fileName = core.getInput('source_file', { required: true })
    let filePath = path.join(process.env.GITHUB_WORKSPACE, fileName)
    if (!fs.existsSync(filePath))
      return core.setFailed(`Source file ${fileName} does not exist.`)

    let content = fs.readFileSync(filePath)
    let regex = new RegExp(core.getInput('extraction_regex'))
    let matches = String(content).match(regex)
    if (!matches)
      return core.setFailed(`No match was found for the regex '${regex.toString()}'.`)

    let capture_group = core.getInput('capture_group', { required: false }).trim()
    if (capture_group.length === 0)
      capture_group = 0
    if (capture_group >= matches.length)
      return core.setFailed(`Unable to find capture_group '${capture_group}' in '${matches.length}' matches.`)

    let version = matches[capture_group]
    let format = core.getInput('tag_format', { required: false }).trim()
    let message = core.getInput('tag_message', { required: false }).trim()
    let name = format.replace('{version}', version)

    core.setOutput('version', version)
    core.setOutput('tagname', name)

    const token = core.getInput("GITHUB_TOKEN", { required: true })
    const octokit = github.getOctokit(token)
    const owner = context.payload.repository.owner.login
    const repo = context.payload.repository.name

    let tags
    try {
      tags = await octokit.rest.repos.listTags({owner, repo, per_page: 100})
    } catch (e) {
      core.warning('No tags were listed')
    }

    if (tags) {
      // check if tag already exists
      for (let tag of tags.data)
        if (tag.name.trim().toLowerCase() === name.trim().toLowerCase())
          return core.warning(`"${tag.name.trim()}" tag already exists.`)
    }

    if (message.length === 0 && tags && tags.data.length > 0) {
      // create tag message from changelog, if none is set
      let latest = tags.data.shift()
      let basehead = `${latest.name}...${context.payload.repository.default_branch}`
      let changelog = await octokit.rest.repos.compareCommitsWithBasehead({owner, repo, basehead})

      message = '\n'
      for (let commit of changelog.data.commits) {
        if (commit) {
          message += `\n* ${commit.commit.message}`

          if (commit.author && commit.author.login)
            message += ` (${commit.author.login })`
        }
      }

      message = message.trim()
    }
    message = message.length > 0 ? message : 'Initial tag'

    core.info(`Making tag '${name}'...`)
    core.debug(`Tag message is:\n${message}.`)
    let tag = await octokit.rest.git.createTag({
      owner,
      repo,
      tag: name,
      message: message,
      object: context.sha,
      type: 'commit'
    })
    core.warning(`Created tag ${name} at ${tag.data.sha}`)

    ref = `refs/tags/${tag.data.tag}`
    core.info(`Making reference '${ref}'...`)
    let reference = await octokit.rest.git.createRef({
      owner,
      repo,
      ref: ref,
      sha: tag.data.sha
    })
    core.warning(`Reference ${reference.data.ref} is now available at ${reference.data.url}`)
    
    if (typeof tag === 'object' && typeof reference === 'object') {
      core.setOutput('tagsha', tag.data.sha)
      core.setOutput('taguri', reference.data.url)
      core.setOutput('tagmessage', message)
    }
  } catch (error) {
    core.warning(error.message)
  }
}

run()
