# Static Web Page Illustrating Archytas's Solution to the Delian Problem

## Building the Web Page

### Tools You Need

To build this project, you'll need npm, as well as the required npm packages
listed in `package.json`.

If you're on a Linux, or other POSIX-like system you can use your package
manager to install npm directly, or install nvm, and use it to install npm.

On a Windows-like platform you can install nvm from a BASH environment. Since
you'll likely need Git to get the code for this project, as well as for nvm
you can:

* Install [Git-scm](https://git-scm.com/download/win).
* Run Git Bash:
* [Install nvm from Git](https://github.com/nvm-sh/nvm#git-install)
* `nvm install node --lts`
* `nvm use --lts`

Now you should be ready to proceed with using npm.

(This project was originally developed with Node v20.9.0.  There have been
several major versions since then.)

### Build Command

To build the CSS, JavaScript, and HTML:

```sh
npm run build:prod
```

The output will be in `dist/`. You can view it locally in a Web browser,
or publish it to the Web.

## Development Notes

### Running Automated Tests

```sh
npm run test
```

### Three.js Notes

This is currently not described in Three.js's (v. 0.149.0) `BufferGeometry`
documentation, but the `.index` attribute can be assigned only a
`BufferAttribute` which contains a JavaScript array of unsigned integers
(e.g., `Uint32Array`, `Uint16Array`). Assigning any other type of array (such
as `Int32Array`) fails (on Chrome v. 109.0.5414.119, Edge v. 109.0.1518.70)
with:

```text
[.WebGL-000027C80038A900] GL_INVALID_ENUM: Invalid enum provided.
```

Firefox v. 109.0 gives a much better error message:

```text
WebGL warning: drawElementsInstanced: type: Invalid enum value INT
```

Although, it's still rather hard to tell what part of the JavaScript code this
error is related to.

Also, this may be obvious, but the correct `BufferAttribute` `itemSize` for an
array of vertex indices is 1.
