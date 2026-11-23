function revealAnchor() {
  const target = document.getElementById(location.hash.slice(1));
  const details = target?.closest('.review');
  if (details && !details.open) {
    details.open = true;
    target.scrollIntoView();
  }
}
addEventListener('hashchange', revealAnchor);
revealAnchor();
