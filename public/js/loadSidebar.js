async function loadSidebar() {
  try {
    const response = await fetch('/components/sidebar.html');
    const html = await response.text();
    document.body.insertAdjacentHTML('afterbegin', html);

    // Reexecuta scripts internos do sidebar (pois fetch não executa <script>)
    document.querySelectorAll('aside.vertical-sidebar script').forEach(oldScript => {
      const newScript = document.createElement('script');
      if (oldScript.src) {
        newScript.src = oldScript.src;
      } else {
        newScript.textContent = oldScript.textContent;
      }
      oldScript.replaceWith(newScript);
    });
  } catch (err) {
    console.error('Erro ao carregar sidebar:', err);
  }
}

loadSidebar();
