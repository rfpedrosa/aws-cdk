exports.handler = async(event, context, callback) => {
    console.log('PreSignUp event data:\n' + JSON.stringify(event));
    return callback(null, event);
};