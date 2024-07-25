class Chatbox {
    constructor() {
        this.args = {
            openButton: document.querySelector('.chatbox__button'),
            chatBox: document.querySelector('.chatbox__support'),
            sendButton: document.querySelector('.send__button'),
            refreshButton: document.querySelector('.refresh__button'),
            voiceButton: document.querySelector('.voice__button'),
            languageDropdown: document.querySelector('.language__dropdown'),
            spinner: document.querySelector('.loading-spinner')
        }

        this.state = {
            isLoggedIn: false,
            session_id: null,
            employee_code: '1',
            firm_id: '1',
            isRecording: false,
            language: 'en-US' // Set default language to English
        };
        this.messages = [];

        this.login();
    }

    login() {
        fetch('https://retrieval-app-fastapi-kqp2s4ffna-uc.a.run.app/login', {
            method: 'POST',
            body: JSON.stringify({
                employee_code: this.state.employee_code,
                firm_id: this.state.firm_id,
            }),
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json'
            },
        })
        .then(r => r.json())
        .then(r => {
            if (r.status === "success") {
                this.state.isLoggedIn = true;
                this.state.session_id = r.session_id;
                console.log('Login successful');
            } else {
                console.error('Login failed');
            }
        }).catch((error) => {
            console.error('Error:', error);
        });
    }

    display() {
        const { openButton, chatBox, sendButton, refreshButton, voiceButton, languageDropdown } = this.args;

        openButton.addEventListener('click', () => this.toggleState(chatBox));

        sendButton.addEventListener('click', () => this.onSendButton(chatBox));

        refreshButton.addEventListener('click', () => this.onRefreshButton(chatBox));

        voiceButton.addEventListener('click', () => this.toggleVoiceRecognition(chatBox));

        languageDropdown.addEventListener('change', (event) => this.changeLanguage(event));

        const node = chatBox.querySelector('input');
        node.addEventListener("keyup", ({ key }) => {
            if (key === "Enter") {
                this.onSendButton(chatBox);
            }
        });
    }

    toggleState(chatbox) {
        this.state.isActive = !this.state.isActive;

        if (this.state.isActive) {
            chatbox.classList.add('chatbox--active');
        } else {
            chatbox.classList.remove('chatbox--active');
        }
    }

    onSendButton(chatbox) {
        if (!this.state.isLoggedIn) {
            console.error('User is not logged in');
            return;
        }

        var textField = chatbox.querySelector('input');
        let text1 = textField.value;
        if (text1 === "") {
            return;
        }

        let msg1 = { name: "User", message: text1 };
        this.messages.push(msg1);
        this.updateChatText(chatbox);
        textField.value = '';

        this.args.sendButton.classList.add('hidden');
        this.args.spinner.classList.add('visible');

        this.translateText(text1, 'en', translatedText => {
            fetch('https://retrieval-app-fastapi-kqp2s4ffna-uc.a.run.app/chat', {
                method: 'POST',
                body: JSON.stringify({
                    session_id: this.state.session_id,
                    input: translatedText
                }),
                mode: 'cors',
                headers: {
                    'Content-Type': 'application/json'
                },
            })
            .then(r => r.json())
            .then(r => {
                this.translateText(r.answer, this.state.language.split('-')[0], translatedResponse => {
                    let msg2 = { name: "Mia", message: translatedResponse };
                    this.messages.push(msg2);
                    this.updateChatText(chatbox);
                });
            }).catch((error) => {
                console.error('Error:', error);
                this.updateChatText(chatbox);
            }).finally(() => {
                this.args.spinner.classList.remove('visible');
                this.args.sendButton.classList.remove('hidden');
            });
        });
    }

    onRefreshButton(chatbox) {
        if (!this.state.isLoggedIn) {
            console.error('User is not logged in');
            return;
        }

        this.args.refreshButton.classList.add('hidden');
        this.args.spinner.classList.add('visible');

        fetch('https://retrieval-app-fastapi-kqp2s4ffna-uc.a.run.app/clear_history', {
            method: 'POST',
            body: JSON.stringify({
                session_id: this.state.session_id
            }),
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json'
            },
        })
        .then(r => r.json())
        .then(r => {
            if (r.status === 'success') {
                this.messages = [];
                this.updateChatText(chatbox);
                console.log('Chat history cleared');
            } else {
                console.error('Failed to clear chat history');
            }
        }).catch((error) => {
            console.error('Error:', error);
        }).finally(() => {
            this.args.spinner.classList.remove('visible');
            this.args.refreshButton.classList.remove('hidden');
        });
    }

    toggleVoiceRecognition(chatbox) {
        if (!this.state.isLoggedIn) {
            console.error('User is not logged in');
            return;
        }

        if (!('webkitSpeechRecognition' in window)) {
            console.error('Speech recognition not supported in this browser');
            return;
        }

        if (this.state.isRecording) {
            this.stopVoiceRecognition();
        } else {
            this.startVoiceRecognition(chatbox);
        }
    }

    startVoiceRecognition(chatbox) {
        this.recognition = new webkitSpeechRecognition();
        this.recognition.lang = this.state.language;
        this.recognition.interimResults = false;
        this.recognition.maxAlternatives = 1;

        this.recognition.start();
        this.state.isRecording = true;
        this.args.voiceButton.classList.add('recording');

        this.recognition.onresult = (event) => {
            const speechResult = event.results[0][0].transcript;
            console.log('Result received: ' + speechResult); 
            let msg1 = { name: "User", message: speechResult };
            this.messages.push(msg1);
            this.updateChatText(chatbox);

            this.args.spinner.classList.add('visible'); 
            this.translateText(speechResult, 'en', translatedText => {
                console.log('Translated to English: ' + translatedText); 

                fetch('https://retrieval-app-fastapi-kqp2s4ffna-uc.a.run.app/chat', {
                    method: 'POST',
                    body: JSON.stringify({
                        session_id: this.state.session_id,
                        input: translatedText
                    }),
                    mode: 'cors',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                })
                .then(r => r.json())
                .then(r => {
                    this.translateText(r.answer, this.state.language.split('-')[0], translatedResponse => {
                        console.log('Translated back to selected language: ' + translatedResponse); 
                        let msg2 = { name: "Mia", message: translatedResponse };
                        this.messages.push(msg2);
                        this.updateChatText(chatbox);
                    });
                }).catch((error) => {
                    console.error('Error:', error);
                    this.updateChatText(chatbox);
                }).finally(() => {
                    this.args.spinner.classList.remove('visible'); 
                    this.args.sendButton.classList.remove('hidden');
                });
            });
        };

        this.recognition.onerror = (event) => {
            console.error('Error occurred in recognition: ' + event.error);
        };

        this.recognition.onend = () => {
            this.stopVoiceRecognition();
        };
    }

    stopVoiceRecognition() {
        if (this.recognition) {
            this.recognition.stop();
            this.state.isRecording = false;
            this.args.voiceButton.classList.remove('recording');
        }
    }

    changeLanguage(event) {
        const languageMap = {
            en: 'en-US',
            hi: 'hi-IN',
            bn: 'bn-IN',
            te: 'te-IN',
            mr: 'mr-IN',
            ta: 'ta-IN',
            gu: 'gu-IN',
            kn: 'kn-IN',
            ml: 'ml-IN',
            pa: 'pa-IN',
            ur: 'ur-IN',
           
        };
        const selectedLanguage = event.target.value;
        this.state.language = languageMap[selectedLanguage] || 'en-US'; // Use appropriate language codes
        console.log('Language changed to:', this.state.language);
    }

    translateText(text, targetLang, callback) {
        const apiKey = 'AIzaSyDk5RQaoYd7eAj3efRoGsYF6xBKbcrP7f8';
        const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;

        fetch(url, {
            method: 'POST',
            body: JSON.stringify({
                q: text,
                target: targetLang,
                format: 'text'
            }),
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => Promise.reject(err));
            }
            return response.json();
        })
        .then(data => {
            if (data.data && data.data.translations && data.data.translations[0]) {
                callback(data.data.translations[0].translatedText);
            } else {
                console.error('Translation API error: Invalid response structure', data);
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
    }

    textToSpeech(text) {
        const apiKey = ''; // Replace with your actual API key
        const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;
        const requestBody = {
            input: { text: text },
            voice: { languageCode: this.state.language, ssmlGender: 'NEUTRAL' },
            audioConfig: { audioEncoding: 'MP3' }
        };

        fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        })
        .then(response => response.json())
        .then(data => {
            if (data.audioContent) {
                const audio = new Audio("data:audio/mp3;base64," + data.audioContent);
                audio.play();
            } else {
                console.error('Error: ', data.error);
            }
        })
        .catch(error => {
            console.error('Fetch error: ', error);
        });
    }

    updateChatText(chatbox) {
        var html = '';
        this.messages.slice().reverse().forEach((item) => {
            if (item.name === "Mia") {
                html += `<div class="messages__item messages__item--visitor">
                            ${marked.parse(item.message)}
                            <button class="audio-icon"  style="border: 0;cursor: pointer;" onclick="chatbox.textToSpeech(decodeURIComponent('${encodeURIComponent(item.message)}'))">
                                <img src="./assets/audio.png" style="width:20px;height:20px;" alt="Audio Icon" />
                            </button>
                         </div>`;
            } else {
                html += `<div class="messages__item messages__item--operator">
                            ${marked.parse(item.message)}
                         </div>`;
            }
        });
    
        const chatmessage = chatbox.querySelector('.chatbox__messages');
        chatmessage.innerHTML = html;
    }
}

const chatbox = new Chatbox();
chatbox.display();
