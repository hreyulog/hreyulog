# 研究 Wiki 维护

运行 `quarto render` 会先执行 `node scripts/build-wiki.mjs`，再生成 `docs/` 静态网站。需要 Node.js 18 或更新版本，无第三方 Node 依赖。

## 内容来源

- `wiki/_articles/*.md` 是中文文章的唯一正文来源。
- `wiki/_catalog.json` 保存文章关系和已发表论文的元数据。
- `wiki/*.qmd`、`wiki/raw/*.md`、`wiki/index.json`、`llms*.txt` 由脚本生成，不直接编辑。
- `wiki/wiki.css` 和 `wiki/search.js` 仅作用于研究页面。

只允许已发表的论文与基于它们的方法解读进入目录。构建脚本包含显式论文白名单；新增条目需核验发表来源，更新白名单并审阅所有输出，不得导入聊天记录、内部项目材料或未发表实验。网页和机器可读文件使用同一份内容。

GitHub Pages 从主分支的 `docs/` 发布。提交前运行完整构建，并检查桌面、手机、搜索、内部链接与 `wiki/index.json`。对既有主页的改动限制为研究页入口与当前站点地址配置。

构建后运行 `node --test scripts/wiki.test.mjs`，检查公开目录、不同格式的正文一致性、页面清单、下载地址和主页入口。该检查无需安装第三方依赖。
