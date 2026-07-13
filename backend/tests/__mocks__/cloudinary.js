module.exports = {
  v2: {
    config: jest.fn(),
    uploader: {
      upload_stream: jest.fn((options, callback) => {
        return {
          end: (buffer) => {
            callback(null, {
              secure_url: 'https://res.cloudinary.com/test-env/image/upload/v12345/test.pdf',
              public_id: 'test-public-id'
            });
          }
        };
      }),
      destroy: jest.fn().mockResolvedValue({ result: 'ok' })
    }
  }
};
