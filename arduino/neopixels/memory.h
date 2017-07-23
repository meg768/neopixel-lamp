
class Memory {

    public:
        Memory() {
            _bytes = NULL;
        }

        virtual ~Memory() {
            free();
        }

        void free() {
            if (_bytes != NULL)
                ::free(_bytes);

            _bytes = NULL;
        }

        void *alloc(int size) {

            void *bytes = NULL;

            if (size > 0) {
                bytes = ::malloc(size);
    
                if (bytes == NULL)
                    return NULL;
            }

            free();

            return _bytes = bytes;
        }

        void *bytes() {
            return _bytes;
        }

    private:
        void *_bytes;
};
