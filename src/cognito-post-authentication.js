exports.handler = async(event, context, callback) => {
    console.log('PostAuthentication event data:\n' + JSON.stringify(event));
    return callback(null, event);
};
