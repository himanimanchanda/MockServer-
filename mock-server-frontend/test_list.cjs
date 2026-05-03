const axios = require('axios');
async function test() {
  try {
    const res = await axios.post('http://localhost:8080/auth/login', {username: 'bot', password: 'password'});
    const token = res.data.token;
    const projRes = await axios.get('http://localhost:8080/projects', {
      headers: { Authorization: 'Bearer ' + token }
    });
    console.log("Projects:", projRes.data.map(p => p.name));
  } catch (e) {
    console.log("Error:", e.response ? e.response.data : e.message);
  }
}
test();
