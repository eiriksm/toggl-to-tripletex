# toggl-to-tripletex

Automating my timesheet filling

[![Greenkeeper badge](https://badges.greenkeeper.io/eiriksm/toggl-to-tripletex.svg)](https://greenkeeper.io/)
[![Build Status](https://travis-ci.org/eiriksm/toggl-to-tripletex.svg?branch=master)](https://travis-ci.org/eiriksm/toggl-to-tripletex)
[![Coverage Status](https://coveralls.io/repos/eiriksm/toggl-to-tripletex/badge.svg?branch=master)](https://coveralls.io/r/eiriksm/toggl-to-tripletex?branch=master)
[![Code Climate](https://codeclimate.com/github/eiriksm/toggl-to-tripletex/badges/gpa.svg)](https://codeclimate.com/github/eiriksm/toggl-to-tripletex)
[![Dependency Status](https://david-dm.org/eiriksm/toggl-to-tripletex.svg)](https://david-dm.org/eiriksm/toggl-to-tripletex)

## Usage

- Clone the repo (`git clone https://github.com/eiriksm/toggl-to-tripletex.git`).
- Install dependencies (`npm i`)
- Create a config file (`cp default.config.json config.json`)
- Find your Toggle API token (should be on your [Toggle profile](https://toggl.com/app/profile)
- Fill in the token and your tripletex login (in your newly created config file).
- If you try to run the tool (`npm start`) it will probably tell you that you need some mappings between Toggle projects and Tripletex projects. Fix it.
