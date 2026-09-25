const bcrypt = require("bcryptjs");
const readline = require("readline");

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question("Enter the password you want for the admin account: ", async (password) => {

    if (!password || password.length < 8) {
        console.log("Password must be at least 8 characters.");
        rl.close();
        return;
    }

    const hash = await bcrypt.hash(password, 12);

    console.log("\nYour password hash is:\n");
    console.log(hash);
    console.log("\nCopy the hash into ADMIN_PASSWORD_HASH in your .env file.");

    rl.close();

});