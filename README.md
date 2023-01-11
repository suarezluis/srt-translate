# srt-translate

## Requirements

### Libraries:

ffmepg: `sudo apt install ffmepg`
live-server: `npmi -g live-server`

### Network

There is 2 options, GitHub Pages OR Your own domain

#### GitHub Pages:

Fork this repo and run `npm run deploy` and make sure that
Pages is set up for your repo on the branch `gh-pages` then add
the url to your .env file

#### Your Own Domain (Fastest translations):

Set up your own domain to point at your external ip address (it has to be port 80)
Configure your router to forward port 80 to port 3333 on your local ip.

### Installation

Run `npm i`

Run `npm run install`

restart your terminal or run `source [Your shell rc file]`
