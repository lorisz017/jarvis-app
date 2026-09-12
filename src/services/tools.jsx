// Definizione degli strumenti che J.A.R.V.I.S. può usare, nel formato di
// tool calling supportato da Groq.
//
// Rispetto al vecchio meccanismo — il modello scriveva "set_alarm 07:30
// palestra" e noi lo riconoscevamo confrontando testo — qui il modello
// dichiara in modo strutturato quale azione vuole e con quali valori. Due
// vantaggi concreti: spariscono gli errori di riconoscimento (un comando
// nominato per sbaglio dentro una frase non viene più eseguito), e il
// modello può chiedere più azioni in una volta sola, che è ciò che rende
// possibili le richieste concatenate.

export const TOOLS = [
    {
        type: 'function',
        function: {
            name: 'set_alarm',
            description:
                'Imposta una sveglia vera nell\'app Orologio del telefono, a un orario preciso. ' +
                'Una richiesta contiene una sola sveglia a meno che l\'utente non ne chieda ' +
                'esplicitamente due: "alle 10 e 17" è un unico orario, le 10:17, non le 10:00 e le 17:00.',
            parameters: {
                type: 'object',
                properties: {
                    hour: {type: 'integer', description: 'Ora, da 0 a 23'},
                    minute: {
                        type: 'integer',
                        description:
                            'Minuti, da 0 a 59. In "alle 10 e 17" i minuti sono 17; in ' +
                            '"alle 10 e un quarto" sono 15, "e mezza" 30, "meno un quarto" 45 ' +
                            'dell\'ora precedente.',
                    },
                    label: {type: 'string', description: 'Etichetta della sveglia, ad esempio "palestra"'},
                },
                required: ['hour', 'minute'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'set_timer',
            description: 'Avvia un timer, cioè un conto alla rovescia, nell\'app Orologio del telefono.',
            parameters: {
                type: 'object',
                properties: {
                    seconds: {type: 'integer', description: 'Durata totale in secondi'},
                    label: {type: 'string', description: 'Etichetta del timer, ad esempio "pasta"'},
                },
                required: ['seconds'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'set_reminder',
            description: 'Crea un promemoria che avvisa con una notifica dopo un certo tempo. Diverso dalla sveglia, che scatta a un orario fisso.',
            parameters: {
                type: 'object',
                properties: {
                    text: {type: 'string', description: 'Cosa ricordare'},
                    seconds: {type: 'integer', description: 'Fra quanti secondi avvisare'},
                },
                required: ['text', 'seconds'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'list_reminders',
            description: 'Elenca i promemoria ancora in attesa.',
            parameters: {type: 'object', properties: {}},
        },
    },
    {
        type: 'function',
        function: {
            name: 'cancel_reminders',
            description: 'Annulla tutti i promemoria in attesa.',
            parameters: {type: 'object', properties: {}},
        },
    },
    {
        type: 'function',
        function: {
            name: 'get_weather',
            description: 'Dice il meteo attuale di una città.',
            parameters: {
                type: 'object',
                properties: {city: {type: 'string', description: 'Nome della città'}},
                required: ['city'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'create_calendar_event',
            description: 'Aggiunge un evento al calendario del telefono.',
            parameters: {
                type: 'object',
                properties: {
                    day: {
                        type: 'string',
                        description: 'Giorno: "oggi", "domani", oppure un giorno della settimana come "lunedì"',
                    },
                    hour: {type: 'integer', description: 'Ora di inizio, da 0 a 23'},
                    minute: {type: 'integer', description: 'Minuti di inizio, da 0 a 59'},
                    title: {type: 'string', description: 'Titolo dell\'evento'},
                },
                required: ['day', 'hour', 'minute', 'title'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'open_app',
            description: 'Apre un\'applicazione installata sul telefono, indicandone il nome comune (WhatsApp, Spotify, Instagram, impostazioni...).',
            parameters: {
                type: 'object',
                properties: {name: {type: 'string', description: 'Nome dell\'app'}},
                required: ['name'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'open_camera',
            description: 'Apre la fotocamera per scattare una foto.',
            parameters: {type: 'object', properties: {}},
        },
    },
    {
        type: 'function',
        function: {
            name: 'open_telegram',
            description: 'Apre Telegram.',
            parameters: {type: 'object', properties: {}},
        },
    },
    {
        type: 'function',
        function: {
            name: 'open_youtube',
            description: 'Apre YouTube, eventualmente su una ricerca.',
            parameters: {
                type: 'object',
                properties: {query: {type: 'string', description: 'Cosa cercare, se richiesto'}},
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'start_navigation',
            description: 'Avvia la navigazione stradale verso una destinazione.',
            parameters: {
                type: 'object',
                properties: {destination: {type: 'string', description: 'Indirizzo o luogo di destinazione'}},
                required: ['destination'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'call_contact',
            description: 'Chiama una persona presente in rubrica.',
            parameters: {
                type: 'object',
                properties: {name: {type: 'string', description: 'Nome del contatto'}},
                required: ['name'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'send_whatsapp',
            description: 'Prepara un messaggio WhatsApp per una persona in rubrica.',
            parameters: {
                type: 'object',
                properties: {
                    name: {type: 'string', description: 'Nome del contatto'},
                    message: {type: 'string', description: 'Testo del messaggio'},
                },
                required: ['name', 'message'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'set_home_city',
            description: 'Imposta la città usata per il meteo del riepilogo di apertura.',
            parameters: {
                type: 'object',
                properties: {city: {type: 'string', description: 'Nome della città'}},
                required: ['city'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'create_github_repo',
            description: 'Crea un repository su GitHub. Il nome va scritto in inglese, minuscolo.',
            parameters: {
                type: 'object',
                properties: {name: {type: 'string', description: 'Nome del repository, minuscolo'}},
                required: ['name'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'delete_github_repo',
            description: 'Elimina un repository da GitHub. All\'utente viene chiesta conferma.',
            parameters: {
                type: 'object',
                properties: {name: {type: 'string', description: 'Nome del repository'}},
                required: ['name'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'get_latest_commits',
            description: 'Mostra gli ultimi commit del repository del progetto.',
            parameters: {
                type: 'object',
                properties: {count: {type: 'integer', description: 'Quanti commit mostrare, predefinito 5'}},
            },
        },
    },
];

const two = (n) => String(n).padStart(2, '0');

// Esegue una singola azione richiesta dal modello e restituisce la frase da
// dire all'utente. Gli errori vengono lasciati salire: chi chiama decide come
// raccontarli.
export async function executeTool(name, args, ctx) {
    switch (name) {
        case 'set_alarm': {
            await ctx.setNativeAlarm(args.hour, args.minute ?? 0, (args.label || 'JARVIS').trim());
            return `Sveglia impostata per le ${two(args.hour)}:${two(args.minute ?? 0)}.`;
        }
        case 'set_timer': {
            const secs = args.seconds;
            await ctx.setNativeTimer(secs, (args.label || 'JARVIS').trim());
            const human = secs >= 60 ? `${Math.round(secs / 60)} minuti` : `${secs} secondi`;
            return `Timer impostato per ${human}.`;
        }
        case 'set_reminder': {
            await ctx.scheduleReminder(args.text, args.seconds);
            const mins = Math.floor(args.seconds / 60);
            const when = mins >= 1 ? `tra ${mins} minuti` : `tra ${args.seconds} secondi`;
            return `Promemoria impostato: "${args.text}" ${when}.`;
        }
        case 'list_reminders': {
            const reminders = await ctx.listReminders();
            if (!reminders.length) return 'Non ha promemoria attivi.';
            const list = reminders
                .map((r) => (r.time ? `— ${r.text} (alle ${r.time})` : `— ${r.text}`))
                .join('\n');
            return `Ecco i suoi promemoria attivi:\n${list}`;
        }
        case 'cancel_reminders': {
            const removed = await ctx.cancelAllReminders();
            return removed ? `Ho annullato ${removed} promemoria.` : 'Non c\'era alcun promemoria da annullare.';
        }
        case 'get_weather': {
            // getWeatherByCity restituisce già una frase rivolta all'utente:
            // qui il "Signore" iniziale è di troppo, viene premesso da chi
            // mette insieme gli esiti delle azioni.
            const meteo = await ctx.getWeatherByCity(args.city);
            return meteo.replace(/^Signore,\s*/i, '').replace(/^./, (c) => c.toUpperCase());
        }
        case 'create_calendar_event': {
            const when = await ctx.createCalendarEvent(args.day, args.hour, args.minute ?? 0, args.title.trim());
            return `Ho aggiunto "${args.title.trim()}" al calendario per ${when}.`;
        }
        case 'open_app':
            await ctx.openApp(args.name);
            return `Apro ${args.name}.`;
        case 'open_camera':
            await ctx.openCamera();
            return 'Apro la fotocamera.';
        case 'open_telegram':
            await ctx.openTelegram();
            return 'Apro Telegram.';
        case 'open_youtube':
            await ctx.openYoutube(args.query);
            return args.query ? `Apro YouTube per la ricerca: ${args.query}.` : 'Apro YouTube.';
        case 'start_navigation':
            await ctx.startNavigation(args.destination);
            return `Avvio la navigazione verso ${args.destination}.`;
        case 'call_contact': {
            const contact = await ctx.callContact(args.name);
            return `Chiamo ${contact}.`;
        }
        case 'send_whatsapp': {
            const contact = await ctx.sendWhatsAppToContact(args.name, args.message);
            return `Ho preparato il messaggio per ${contact}.`;
        }
        case 'set_home_city':
            ctx.setHomeCity(args.city);
            return `D'ora in poi userò ${args.city} per il riepilogo di apertura.`;
        case 'create_github_repo': {
            const url = await ctx.createGitHubRepo({name: args.name});
            return `Il repository ${args.name} è stato creato. ${url}`;
        }
        case 'delete_github_repo': {
            const confirmed = await ctx.confirmRepoDeletion(args.name);
            if (!confirmed) return 'Eliminazione annullata.';
            await ctx.deleteGitHubRepo('lorisz017', args.name);
            return `Il repository ${args.name} è stato eliminato.`;
        }
        case 'get_latest_commits': {
            const commits = await ctx.getLatestCommits(args.count || 5);
            if (!commits.length) return 'Non è stato trovato nessun commit.';
            const list = commits.map((c) => `— ${c.author}: ${c.message.split('\n')[0]}`).join('\n');
            return `Ecco gli ultimi commit:\n${list}`;
        }
        default:
            throw new Error(`azione sconosciuta: ${name}`);
    }
}
