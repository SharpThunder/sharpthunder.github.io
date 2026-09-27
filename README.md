# sharpthunder.github.io

Personal site + blog. Jekyll, built automatically by GitHub Pages on push.

## Write a post

1. Create `_posts/YYYY-MM-DD-some-title.md`:
   ```markdown
   ---
   layout: post
   title: "Your title"
   description: One line shown on the blog list.
   tags: [aws, terraform]
   ---

   Text in Markdown.
   ```
2. `git add . && git commit -m "post: your title" && git push`. It is live in about a minute.

Work in progress goes in `_drafts/` (never published).

## Edit the about page

`index.md`. Links and name are in `_config.yml`.
