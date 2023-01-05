const User = require('../../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const emailPassLoginController = async (req, res) => {

    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Username and password are required!' });
    }

    const foundUser = await User.findOne({ email: email }).exec();

    if (!foundUser) {
        // User not found
        return res.status(401).json({
            message: `No user found with email: ${email}`
        })
    }


    try {
        const match = await bcrypt.compare(password, foundUser.password);

        if (!match) {
            // Password does not match
            return res.statu(401).json({
                message: `Password for ${email} is invalid!`
            })
        }


        //match is successful, generate access + refresh tokens
        const refreshToken = await jwt.sign({
            UserRoles: {
                username: foundUser.username,
                firstname: foundUser.firstname,
                email: foundUser.email,
                userRoles: foundUser.roles
            }
        }, process.env.JWT_REFRESH_TOKEN_SECRET, { expiresIn: '1000s' });


        const accessToken = await jwt.sign({
            username: foundUser.username,
            firstname: foundUser.firstname,
            email: foundUser.email,
            userRoles: foundUser.roles
        }, process.env.JWT_ACCESS_TOKEN_SECRET, { expiresIn: '1000s' });

        foundUser.refreshToken = refreshToken;

        const result = await foundUser.save().catch(err => {
            console.error(err)
            return res.status(500).json({ message: err })
        })

        console.log(result);

        //Issuing cookie
        //HTTP-Only cookie is not available to JS. So cannot be stolen by hackers
        res.cookie('jwt', refreshToken, { httpOnly: true, sameSite: 'None', maxAge: 24 * 60 * 60 * 1000 }); //1day


        return res.status(201).json({
            message: `Welcome ${email}! Logged in successfuly!`,
            accessToken: accessToken

        })

    } catch (err) {
        console.error(err)
        return res.status(500).json({ message: err })
    }













}

module.exports = { emailPassLoginController }