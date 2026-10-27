<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- App data (users, roles, gift codes, scans, notes) lives in src/lib/store.tsx via localStorage — demo-only until Lovable Cloud is enabled; swap the store for real auth/DB then.
- Eric chat streams from the server route src/routes/api/chat.ts through the Lovable AI Gateway; chat history is one conversation kept in browser localStorage.
