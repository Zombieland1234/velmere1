fetch('http://localhost:3000/pl')
  .then(res => {
    console.log('Status:', res.status);
    return res.text();
  })
  .then(text => console.log('Length:', text.length, 'Preview:', text.slice(0, 200)))
  .catch(err => console.error('Fetch err:', err.message));
