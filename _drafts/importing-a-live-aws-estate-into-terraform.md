---
layout: post
title: "Importing a live AWS estate into Terraform"
description: What I learned bringing a production AWS account under Terraform without breaking anything.
tags: [terraform, aws]
---

<!--
DRAFT: not published. Files in _drafts/ never go live.
To publish: move this file to _posts/ and rename it YYYY-MM-DD-importing-a-live-aws-estate-into-terraform.md

Outline, fill each in your own words:
1. The starting point: what was ClickOps, what was already in Terraform (China), why EU had to follow.
2. How you checked every plan before apply.
3. Import order: why networking and security groups first, then compute, data and edge.
4. Surprises: e.g. a bucket that lived in eu-west-1 instead of eu-central-1 and needed a second provider alias.
5. Making modules work in both AWS partitions (arn:aws vs arn:aws-cn, different service principals).
6. Result: what's easier now.

Keep company names, account IDs, IPs and hostnames out of it.
-->
