window.addEventListener('message', event => {
  const markdown = event.data.markdown;
  const lines = markdown.split('\n').filter(line => line.trim());

  const container = document.getElementById('chat-container');
  container.innerHTML = '';

  lines.forEach(line => {
    let role = '';
    let text = '';

    if (line.startsWith('@ai')) {
      role = 'ai';
      text = line.replace('@ai', '').trim();
    } else if (line.startsWith('@me')) {
      role = 'me';
      text = line.replace('@me', '').trim();
    }

    if (role) {
      const div = document.createElement('div');
      div.className = `message ${role}`;
      div.textContent = text;
      container.appendChild(div);
    }
  });
});