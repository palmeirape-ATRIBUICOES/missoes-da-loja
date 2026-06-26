## Regras de Automação do Projeto

1. **Sempre rodar o deploy automaticamente:** Ao finalizar com sucesso qualquer alteração ou melhoria no código, execute diretamente o script de deploy automático (`powershell -ExecutionPolicy Bypass -File .\deploy.ps1 "mensagem do commit"`) para atualizar o GitHub Pages imediatamente, sem a necessidade de solicitar confirmação prévia ao usuário.
