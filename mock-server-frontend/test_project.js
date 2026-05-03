const axios = require('axios');
async function test() {
  try {
    const res = await axios.post('http://localhost:8080/auth/register', {username: 'garvit2', password: 'password'});
    const token = res.data.token;
    console.log("Token:", token);
    const projRes = await axios.post('http://localhost:8080/projects', {name: 'hello_test_123'}, {
      headers: { Authorization: 'Bearer ' + token }
    });
    console.log("Created:", projRes.data);
  } catch (e) {
    console.log("Error:", e.response ? e.response.data : e.message);
  }
}
test();
