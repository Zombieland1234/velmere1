fetch('http://localhost:3000/pl')
  .then(res => res.text())
  .then(text => console.log(text.slice(0, 1500)));
