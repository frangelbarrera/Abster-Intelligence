const fs = require('fs');

const oldToolsStr = [
  '{id:1,name:"Shodan",icon:"🔍",cat:"domain",sub:"Scanner",desc:"Internet-connected device search engine. Find open ports, banners, and exposed services worldwide.",tags:["free","api"],color:"#10B981",url:"https://shodan.io"}',
  '{id:2,name:"Censys",icon:"🔎",cat:"domain",sub:"Scanner",desc:"Search engine for internet-facing infrastructure with certificate and host data.",tags:["api","free"],color:"#10B981",url:"https://censys.io"}',
  '{id:3,name:"FOFA",icon:"🌏",cat:"domain",sub:"Search",desc:"Chinese internet asset search engine, excellent for finding Asian infrastructure.",tags:["api"],color:"#10B981",url:"https://fofa.info"}',
  '{id:4,name:"ZoomEye",icon:"🔭",cat:"domain",sub:"Search",desc:"Cyberspace search engine supporting IPv4, IPv6, and website fingerprinting.",tags:["api","free"],color:"#10B981",url:"https://zoomeye.org"}',
  '{id:5,name:"IntelligenceX",icon:"🗄️",cat:"breach",sub:"Archive",desc:"Search engine for dark web, leaks, document libraries, and historical data.",tags:["api","paid"],color:"#F97316",url:"https://intelx.io"}',
  '{id:6,name:"PublicWWW",icon:"</>",cat:"search",sub:"Code",desc:"Search website source code to find code patterns, snippets, and technologies.",tags:["free","api"],color:"#3B82F6",url:"https://publicwww.com"}',
  '{id:7,name:"GreyNoise",icon:"📡",cat:"domain",sub:"IP",desc:"Analyzes internet background noise to distinguish targeted attacks from mass scanning.",tags:["api","free"],color:"#10B981",url:"https://greynoise.io"}',
  '{id:8,name:"BinaryEdge",icon:"⚡",cat:"domain",sub:"Scanner",desc:"Real-time collection and analysis of internet data and threat intelligence.",tags:["api","paid"],color:"#10B981",url:"https://binaryedge.io"}',
  '{id:9,name:"Netlas",icon:"🌐",cat:"domain",sub:"Scanner",desc:"Internet intelligence search engine with DNS, WHOIS, and port scan data.",tags:["api","free"],color:"#10B981",url:"https://netlas.io"}',
  '{id:10,name:"CriminalIP",icon:"🚨",cat:"domain",sub:"IP",desc:"AI-based cybersecurity threat intelligence platform with CVE and IP data.",tags:["api","free"],color:"#10B981",url:"https://criminalip.io"}',
  '{id:11,name:"Yandex Search",icon:"🇷🇺",cat:"search",sub:"Search",desc:"Russian search engine with superior reverse image and face search capabilities.",tags:["free"],color:"#3B82F6",url:"https://yandex.com"}',
  '{id:12,name:"DorkGPT",icon:"🤖",cat:"search",sub:"Dorks",desc:"AI-powered Google dork generator for advanced search query construction.",tags:["free"],color:"#3B82F6",url:"https://dorkgpt.com"}',
  '{id:13,name:"Maigret",icon:"🕵️",cat:"social",sub:"Username",desc:"Username search on 500+ sites simultaneously. Most comprehensive username checker.",tags:["free","open-source"],color:"#8B5CF6",url:"https://github.com/soxoj/maigret"}',
  '{id:14,name:"Sherlock",icon:"🔍",cat:"social",sub:"Username",desc:"Hunt down social media accounts by username across social networks.",tags:["free","open-source"],color:"#8B5CF6",url:"https://github.com/sherlock-project/sherlock"}',
  '{id:15,name:"WhatsMyName",icon:"📛",cat:"social",sub:"Username",desc:"Comprehensive username enumeration tool with web interface.",tags:["free"],color:"#8B5CF6",url:"https://whatsmyname.app"}',
  '{id:16,name:"Blackbird",icon:"🐦",cat:"social",sub:"Username",desc:"OSINT tool for rapid username search across multiple social networks.",tags:["free","open-source"],color:"#8B5CF6",url:"https://github.com/p1ngul1n0/blackbird"}',
  '{id:17,name:"GHunt",icon:"🎭",cat:"social",sub:"Google",desc:"Offensive Google framework to extract information from Google accounts.",tags:["free","open-source"],color:"#8B5CF6",url:"https://github.com/mxrch/GHunt"}',
  '{id:18,name:"Twint",icon:"🐦",cat:"social",sub:"Twitter/X",desc:"Twitter intelligence tool with no API required. Scrape profiles and tweets.",tags:["free","open-source"],color:"#8B5CF6",url:"https://github.com/twintproject/twint"}',
  '{id:19,name:"Instaloader",icon:"📸",cat:"social",sub:"Instagram",desc:"Download Instagram stories, posts, profiles and metadata.",tags:["free","open-source"],color:"#8B5CF6",url:"https://instaloader.github.io"}',
  '{id:20,name:"Osintgram",icon:"🖼️",cat:"social",sub:"Instagram",desc:"OSINT tool to gather information from Instagram accounts.",tags:["free","open-source"],color:"#8B5CF6",url:"https://github.com/Datalux/Osintgram"}',
  '{id:21,name:"CrossLinked",icon:"💼",cat:"social",sub:"LinkedIn",desc:"LinkedIn enumeration tool to find valid employee names from a target organization.",tags:["free","open-source"],color:"#8B5CF6",url:"https://github.com/m8r0wn/crosslinked"}',
  '{id:22,name:"Social Analyzer",icon:"📊",cat:"social",sub:"Multi",desc:"Analyze and find social media profiles for a target across 1000+ websites.",tags:["free","open-source"],color:"#8B5CF6",url:"https://github.com/qeeqbox/social-analyzer"}',
  '{id:23,name:"Tgstat",icon:"📱",cat:"social",sub:"Telegram",desc:"Telegram channels and groups analytics and search platform.",tags:["free","api"],color:"#8B5CF6",url:"https://tgstat.com"}',
  '{id:24,name:"Reddit Analyzer",icon:"🤖",cat:"social",sub:"Reddit",desc:"Analyze Reddit user history, activity patterns, and post behavior.",tags:["free"],color:"#8B5CF6",url:"https://redditanalyzer.io"}',
  '{id:25,name:"HaveIBeenPwned",icon:"💥",cat:"breach",sub:"Email",desc:"Check if email or phone was compromised in a data breach. Essential first tool.",tags:["api","free"],color:"#F97316",url:"https://haveibeenpwned.com"}',
  '{id:26,name:"DeHashed",icon:"🗝️",cat:"breach",sub:"Credentials",desc:"Search engine for leaked databases including passwords and personal data.",tags:["api","paid"],color:"#F97316",url:"https://dehashed.com"}',
  '{id:27,name:"Holehe",icon:"📧",cat:"email",sub:"Email",desc:"Check if an email is used on various websites including Twitter, Instagram.",tags:["free","open-source"],color:"#F59E0B",url:"https://github.com/megadose/holehe"}',
  '{id:28,name:"h8mail",icon:"📬",cat:"email",sub:"Email",desc:"Email OSINT and breach hunting tool using multiple data sources.",tags:["free","open-source"],color:"#F59E0B",url:"https://github.com/khast3x/h8mail"}',
  '{id:29,name:"Hunter.io",icon:"🎯",cat:"email",sub:"Email",desc:"Find professional email addresses for any company domain.",tags:["api","freemium"],color:"#F59E0B",url:"https://hunter.io"}',
  '{id:30,name:"Phoneinfoga",icon:"📞",cat:"email",sub:"Phone",desc:"Advanced information gathering tool for phone numbers. OSINT framework.",tags:["free","open-source"],color:"#F59E0B",url:"https://github.com/sundowndev/phoneinfoga"}',
  '{id:31,name:"Truecaller",icon:"📲",cat:"email",sub:"Phone",desc:"Identify unknown callers and search phone numbers globally.",tags:["freemium"],color:"#F59E0B",url:"https://truecaller.com"}',
  '{id:32,name:"Snusbase",icon:"🔓",cat:"breach",sub:"Credentials",desc:"Breach search engine with billions of records from data breaches.",tags:["paid","api"],color:"#F97316",url:"https://snusbase.com"}',
  '{id:33,name:"LeakCheck",icon:"🔍",cat:"breach",sub:"Credentials",desc:"Find leaked accounts and passwords by email, username, or password.",tags:["freemium","api"],color:"#F97316",url:"https://leakcheck.io"}',
  '{id:34,name:"OSINT Industries",icon:"🏭",cat:"email",sub:"Multi",desc:"Automated OSINT investigations on email addresses, phones, and usernames.",tags:["paid","api"],color:"#F59E0B",url:"https://osint.industries"}',
  '{id:35,name:"DNSDumpster",icon:"🌐",cat:"domain",sub:"DNS",desc:"Domain research and DNS recon tool with visual network mapping.",tags:["free"],color:"#10B981",url:"https://dnsdumpster.com"}',
  '{id:36,name:"SecurityTrails",icon:"🔒",cat:"domain",sub:"History",desc:"Historical DNS and domain data, subdomain discovery, and WHOIS history.",tags:["api","freemium"],color:"#10B981",url:"https://securitytrails.com"}',
  '{id:37,name:"CRT.sh",icon:"📜",cat:"domain",sub:"Certs",desc:"Certificate transparency log search. Find subdomains via SSL certificates.",tags:["free"],color:"#10B981",url:"https://crt.sh"}',
  '{id:38,name:"Subfinder",icon:"🔎",cat:"domain",sub:"Subdomain",desc:"Fast passive subdomain discovery tool with multiple data sources.",tags:["free","open-source"],color:"#10B981",url:"https://github.com/projectdiscovery/subfinder"}',
  '{id:39,name:"Amass",icon:"🕸️",cat:"domain",sub:"Recon",desc:"In-depth DNS enumeration and network mapping of attack surface.",tags:["free","open-source"],color:"#10B981",url:"https://github.com/owasp-amass/amass"}',
  '{id:40,name:"VirusTotal",icon:"🦠",cat:"domain",sub:"Reputation",desc:"Analyze files, URLs, domains, and IPs for malware and threat indicators.",tags:["api","free"],color:"#10B981",url:"https://virustotal.com"}',
  '{id:41,name:"AbuseIPDB",icon:"🚫",cat:"domain",sub:"IP",desc:"IP address abuse reporting and lookup database.",tags:["api","free"],color:"#10B981",url:"https://abuseipdb.com"}',
  '{id:42,name:"IPinfo",icon:"📍",cat:"domain",sub:"IP",desc:"Comprehensive IP intelligence including geolocation, ASN, and company data.",tags:["api","freemium"],color:"#10B981",url:"https://ipinfo.io"}',
  '{id:43,name:"BGP.he.net",icon:"🗺️",cat:"domain",sub:"BGP",desc:"Hurricane Electric BGP Toolkit for AS and IP routing research.",tags:["free"],color:"#10B981",url:"https://bgp.he.net"}',
  '{id:44,name:"SpyOnWeb",icon:"🕷️",cat:"domain",sub:"Tracking",desc:"Find related websites by IP address or analytics tracking ID.",tags:["free"],color:"#10B981",url:"https://spyonweb.com"}',
  '{id:45,name:"Suncalc",icon:"☀️",cat:"geo",sub:"Analysis",desc:"Calculate sun position, direction, and shadows for any location and time.",tags:["free"],color:"#EF4444",url:"https://suncalc.org"}',
  '{id:46,name:"Overpass Turbo",icon:"🗺️",cat:"geo",sub:"Maps",desc:"OpenStreetMap data extraction tool for geographical querying.",tags:["free"],color:"#EF4444",url:"https://overpass-turbo.eu"}',
  '{id:47,name:"Sentinel-Hub",icon:"🛰️",cat:"geo",sub:"Satellite",desc:"Cloud-based satellite imagery processing and analysis platform.",tags:["freemium","api"],color:"#EF4444",url:"https://sentinel-hub.com"}',
  '{id:48,name:"NASA FIRMS",icon:"🔥",cat:"geo",sub:"Fire",desc:"Fire Information for Resource Management System with real-time fire data.",tags:["free"],color:"#EF4444",url:"https://firms.modaps.eosdis.nasa.gov"}',
  '{id:49,name:"FotoForensics",icon:"🔬",cat:"geo",sub:"Image",desc:"Metadata and error level analysis for digital forensics image examination.",tags:["free"],color:"#EF4444",url:"https://fotoforensics.com"}',
  '{id:50,name:"PimEyes",icon:"👁️",cat:"geo",sub:"FaceSearch",desc:"Face recognition search engine.",tags:["freemium","paid"],color:"#EF4444",url:"https://pimeyes.com"}',
  '{id:51,name:"Picarta",icon:"📌",cat:"geo",sub:"Geoguess",desc:"AI-powered image geolocation to predict where a photo was taken.",tags:["free"],color:"#EF4444",url:"https://picarta.ai"}',
  '{id:52,name:"WiGLE",icon:"📶",cat:"geo",sub:"WiFi",desc:"Worldwide database of wireless networks with mapping capabilities.",tags:["free","api"],color:"#EF4444",url:"https://wigle.net"}',
  '{id:53,name:"FlightRadar24",icon:"✈️",cat:"transport",sub:"Aviation",desc:"Real-time flight tracking with ADS-B data for commercial aviation.",tags:["freemium"],color:"#06B6D4",url:"https://flightradar24.com"}',
  '{id:54,name:"MarineTraffic",icon:"🚢",cat:"transport",sub:"Maritime",desc:"Global ship tracking intelligence with vessel positions and port data.",tags:["freemium","api"],color:"#06B6D4",url:"https://marinetraffic.com"}',
  '{id:55,name:"TinEye",icon:"🔍",cat:"geo",sub:"Image",desc:"Reverse image search engine to find where an image appears online.",tags:["freemium","api"],color:"#EC4899",url:"https://tineye.com"}',
  '{id:56,name:"Hudson Rock",icon:"🪨",cat:"breach",sub:"Infostealers",desc:"Compromised credentials and infostealer data from cybercrime intelligence.",tags:["free","api"],color:"#F97316",url:"https://hudsonrock.com"}',
  '{id:57,name:"BreachDirectory",icon:"📁",cat:"breach",sub:"Search",desc:"Search engine for data breaches with email and username lookup.",tags:["freemium","api"],color:"#F97316",url:"https://breachdirectory.org"}',
  '{id:58,name:"Psbdmp",icon:"📋",cat:"breach",sub:"Paste",desc:"Search pastebin and other paste sites for leaked credentials and data.",tags:["free"],color:"#F97316",url:"https://psbdmp.ws"}',
  '{id:59,name:"Etherscan",icon:"⬡",cat:"crypto",sub:"Ethereum",desc:"Ethereum blockchain explorer for transactions, tokens, and smart contracts.",tags:["api","free"],color:"#84CC16",url:"https://etherscan.io"}',
  '{id:60,name:"Blockchain.info",icon:"₿",cat:"crypto",sub:"Bitcoin",desc:"Bitcoin blockchain explorer with wallet balance and transaction data.",tags:["api","free"],color:"#84CC16",url:"https://blockchain.info"}',
  '{id:61,name:"Arkham Intelligence",icon:"🦅",cat:"crypto",sub:"Analytics",desc:"On-chain analytics platform to deanonymize crypto wallets and track flows.",tags:["freemium"],color:"#84CC16",url:"https://arkhamintelligence.com"}',
  '{id:62,name:"Chainalysis",icon:"🔗",cat:"crypto",sub:"Compliance",desc:"Blockchain analytics for cryptocurrency compliance and investigation.",tags:["paid"],color:"#84CC16",url:"https://chainalysis.com"}',
  '{id:63,name:"OXT",icon:"📊",cat:"crypto",sub:"Bitcoin",desc:"Bitcoin analytics platform for clustering, profiling, and visualization.",tags:["free"],color:"#84CC16",url:"https://oxt.me"}',
  '{id:64,name:"Ahmia",icon:"🌑",cat:"dark",sub:"Search",desc:"Search engine for onion services accessible via Tor browser.",tags:["free"],color:"#6B7280",url:"https://ahmia.fi"}',
  '{id:65,name:"Dark.fail",icon:"🔒",cat:"dark",sub:"Directory",desc:"Status checker and directory of dark web services and markets.",tags:["free"],color:"#6B7280",url:"https://dark.fail"}',
  '{id:66,name:"ExoneraTor",icon:"🧅",cat:"dark",sub:"Tor",desc:"Check if an IP was a Tor relay at a specific date and time.",tags:["free"],color:"#6B7280",url:"https://metrics.torproject.org/exonerator.html"}',
  '{id:67,name:"Maltego",icon:"🕸️",cat:"framework",sub:"Visual",desc:"Interactive data mining tool for link analysis and visual investigation.",tags:["freemium","paid"],color:"#14B8A6",url:"https://maltego.com"}',
  '{id:68,name:"SpiderFoot",icon:"🕷️",cat:"framework",sub:"Automated",desc:"Automated OSINT platform with 200+ modules for threat intelligence.",tags:["free","open-source"],color:"#14B8A6",url:"https://spiderfoot.net"}',
  '{id:69,name:"Recon-ng",icon:"🔧",cat:"framework",sub:"Terminal",desc:"Full-featured web reconnaissance framework with modular architecture.",tags:["free","open-source"],color:"#14B8A6",url:"https://github.com/lanmaster53/recon-ng"}',
  '{id:70,name:"theHarvester",icon:"🌾",cat:"framework",sub:"Harvesting",desc:"Gather emails, subdomains, IPs, and URLs using multiple public data sources.",tags:["free","open-source"],color:"#14B8A6",url:"https://github.com/laramies/theHarvester"}',
  '{id:71,name:"InVID & WeVerify",icon:"🎞️",cat:"verify",sub:"Video",desc:"Verification plugin for images and videos. Reverse search and metadata.",tags:["free"],color:"#EC4899",url:"https://weverify.eu"}',
  '{id:72,name:"Forensically",icon:"🔍",cat:"verify",sub:"Image",desc:"Image forensics tool with magnifier, clone detection, and noise analysis.",tags:["free"],color:"#EC4899",url:"https://29a.ch/photo-forensics"}',
  '{id:73,name:"FaceCheck.ID",icon:"😶",cat:"geo",sub:"FaceSearch",desc:"Reverse image search using facial recognition to find a person online.",tags:["freemium"],color:"#EC4899",url:"https://facecheck.id"}',
  '{id:74,name:"URLScan.io",icon:"🌐",cat:"domain",sub:"URL",desc:"Scan and analyze websites to see what they load and where they connect.",tags:["api","free"],color:"#10B981",url:"https://urlscan.io"}',
  '{id:75,name:"Wayback Machine",icon:"⏮️",cat:"search",sub:"Archive",desc:"Internet Archives time machine to browse historical web content.",tags:["free","api"],color:"#3B82F6",url:"https://web.archive.org"}',
  '{id:76,name:"ADS-B Exchange",icon:"📡",cat:"transport",sub:"Aviation",desc:"Unfiltered ADS-B flight tracking data. Tracks military and private jets.",tags:["free"],color:"#06B6D4",url:"https://globe.adsbexchange.com"}',
  '{id:77,name:"VesselFinder",icon:"⛵",cat:"transport",sub:"Maritime",desc:"Free vessel tracking service showing real-time ship positions.",tags:["free"],color:"#06B6D4",url:"https://vesselfinder.com"}',
  '{id:78,name:"Broadcastify",icon:"📻",cat:"transport",sub:"Radio",desc:"Listen to live police, fire, EMS, and aviation radio feeds.",tags:["freemium"],color:"#06B6D4",url:"https://broadcastify.com"}',
  '{id:79,name:"Baidu",icon:"🇨🇳",cat:"search",sub:"Search",desc:"Leading Chinese search engine, essential for OSINT in the Asian region.",tags:["free"],color:"#3B82F6",url:"https://baidu.com"}',
  '{id:80,name:"Startpage",icon:"🛡️",cat:"search",sub:"Privacy",desc:"Search engine that provides Google results without tracking or logging user data.",tags:["free"],color:"#3B82F6",url:"https://startpage.com"}',
  '{id:81,name:"SearchCode",icon:"💻",cat:"search",sub:"Code",desc:"Search across 75 billion lines of code from over 40 million projects.",tags:["free"],color:"#3B82F6",url:"https://searchcode.com"}',
  '{id:82,name:"SimilarSites",icon:"🔗",cat:"search",sub:"Discovery",desc:"Find websites similar to the ones you already know and use.",tags:["free"],color:"#3B82F6",url:"https://www.similarsites.com"}',
  '{id:83,name:"NerdyData",icon:"⚙️",cat:"search",sub:"Tech",desc:"Search engine for finding websites based on the technologies they use.",tags:["free","api"],color:"#3B82F6",url:"https://www.nerdydata.com"}',
  '{id:84,name:"Intezer Analyze",icon:"🧬",cat:"search",sub:"Malware",desc:"Genetic malware analysis platform to identify code reuse and origins.",tags:["free","api"],color:"#3B82F6",url:"https://analyze.intezer.com"}',
  '{id:85,name:"Kaspersky OpenTIP",icon:"🛡️",cat:"search",sub:"Threats",desc:"Open Threat Intelligence Portal for scanning files, hashes, and URLs.",tags:["free"],color:"#3B82F6",url:"https://opentip.kaspersky.com"}',
  '{id:86,name:"AlienVault OTX",icon:"👽",cat:"search",sub:"Threats",desc:"Open Threat Exchange for sharing and investigating threat indicators.",tags:["free","api"],color:"#3B82F6",url:"https://otx.alienvault.com"}',
  '{id:87,name:"ExploitDB",icon:"💣",cat:"search",sub:"Exploits",desc:"Archive of exploits and vulnerable software for security research.",tags:["free"],color:"#3B82F6",url:"https://www.exploit-db.com"}',
  '{id:88,name:"MalwareBazaar",icon:"🦠",cat:"search",sub:"Malware",desc:"Database of malware samples shared by the security community.",tags:["free","api"],color:"#3B82F6",url:"https://bazaar.abuse.ch"}',
  '{id:89,name:"PhishTank",icon:"🎣",cat:"search",sub:"Phishing",desc:"Collaborative clearing house for data and information about phishing on the Internet.",tags:["free","api"],color:"#3B82F6",url:"https://www.phishtank.com"}',
  '{id:90,name:"URLhaus",icon:"🔗",cat:"search",sub:"Malware",desc:"Database of malicious URLs used for malware distribution.",tags:["free","api"],color:"#3B82F6",url:"https://urlhaus.abuse.ch"}',
  '{id:91,name:"Snoop",icon:"🕵️",cat:"social",sub:"Username",desc:"Powerful username enumeration tool with a focus on Russian and CIS platforms.",tags:["free","open-source"],color:"#8B5CF6",url:"https://github.com/snooppr/snoop"}',
  '{id:92,name:"UserSearch",icon:"👤",cat:"social",sub:"Username",desc:"Large reverse user search engine covering 600+ social platforms.",tags:["free"],color:"#8B5CF6",url:"https://usersearch.org"}',
  '{id:93,name:"Social-Searcher",icon:"🔍",cat:"social",sub:"Search",desc:"Real-time social media search engine for tracking mentions and trends.",tags:["free","api"],color:"#8B5CF6",url:"https://www.social-searcher.com"}',
  '{id:94,name:"BoardReader",icon:"💬",cat:"social",sub:"Forums",desc:"Search engine for forums, message boards, and community discussions.",tags:["free"],color:"#8B5CF6",url:"https://boardreader.com"}',
  '{id:95,name:"SocialBearing",icon:"🐦",cat:"social",sub:"Twitter/X",desc:"Twitter analytics and search tool for tweets, timelines, and users.",tags:["free"],color:"#8B5CF6",url:"https://socialbearing.com"}',
  '{id:96,name:"Infobel",icon:"📖",cat:"email",sub:"Phone",desc:"Global business and people directory for phone and address lookup.",tags:["free"],color:"#F59E0B",url:"https://www.infobel.com"}',
  '{id:97,name:"Espy",icon:"📞",cat:"email",sub:"Phone",desc:"Advanced phone number search and identity verification platform.",tags:["paid"],color:"#F59E0B",url:"http://espysys.com"}',
  '{id:98,name:"Sync.me",icon:"📱",cat:"email",sub:"Phone",desc:"Reverse phone lookup and caller ID with social media integration.",tags:["free"],color:"#F59E0B",url:"https://sync.me"}',
  '{id:99,name:"RocketReach",icon:"🚀",cat:"email",sub:"Email",desc:"Find email addresses, phone numbers, and social profiles for professionals.",tags:["paid","api"],color:"#F59E0B",url:"https://rocketreach.co"}',
  '{id:100,name:"Lusha",icon:"🏢",cat:"email",sub:"Email",desc:"B2B contact information platform for finding professional emails and phones.",tags:["paid","api"],color:"#F59E0B",url:"https://www.lusha.com"}',
  '{id:101,name:"Anymail Finder",icon:"✉️",cat:"email",sub:"Email",desc:"Verified email finder for sales and outreach campaigns.",tags:["paid","api"],color:"#F59E0B",url:"https://anymailfinder.com"}',
  '{id:102,name:"VoilaNorbert",icon:"🎩",cat:"email",sub:"Email",desc:"Email finder and verifier tool for professional networking.",tags:["paid","api"],color:"#F59E0B",url:"https://www.voilanorbert.com"}',
  '{id:103,name:"Clearbit",icon:"🎯",cat:"email",sub:"Email",desc:"B2B marketing intelligence and data enrichment platform.",tags:["paid","api"],color:"#F59E0B",url:"https://clearbit.com"}',
  '{id:104,name:"DNSViz",icon:"🗺️",cat:"domain",sub:"DNS",desc:"Tool for visualizing the status of a DNS zone and its security.",tags:["free"],color:"#10B981",url:"https://dnsviz.net"}',
  '{id:105,name:"DNS Twister",icon:"🌪️",cat:"domain",sub:"DNS",desc:"Domain name permutation engine for finding typosquatting and phishing.",tags:["free"],color:"#10B981",url:"https://dnstwister.report"}',
  '{id:106,name:"DNSDumpster",icon:"🗑️",cat:"domain",sub:"DNS",desc:"Domain research tool that can discover hosts related to a domain.",tags:["free"],color:"#10B981",url:"https://dnsdumpster.com"}',
  '{id:107,name:"Subdomain Center",icon:"🎯",cat:"domain",sub:"Subdomain",desc:"Fast subdomain discovery tool using multiple public sources.",tags:["free"],color:"#10B981",url:"https://www.subdomain.center"}',
  '{id:108,name:"SubdomainRadar",icon:"📡",cat:"domain",sub:"Subdomain",desc:"Real-time subdomain monitoring and discovery platform.",tags:["free","api"],color:"#10B981",url:"https://www.subdomainradar.io"}',
  '{id:109,name:"DNSTrails",icon:"👣",cat:"domain",sub:"History",desc:"Historical DNS records and domain data search engine.",tags:["free","api"],color:"#10B981",url:"https://dnstrails.com/"}',
  '{id:110,name:"DNS History",icon:"📜",cat:"domain",sub:"History",desc:"Search engine for historical DNS records and domain changes.",tags:["free"],color:"#10B981",url:"http://dnshistory.org"}',
  '{id:111,name:"Nmap Online",icon:"🔍",cat:"domain",sub:"Scanner",desc:"Web-based Nmap scanner for quick port and service discovery.",tags:["free"],color:"#10B981",url:"https://nmap.online"}',
  '{id:112,name:"Binary Defense",icon:"🛡️",cat:"domain",sub:"Threats",desc:"Threat intelligence feeds and malicious IP/domain lists.",tags:["free"],color:"#10B981",url:"https://www.binarydefense.com/banlist.txt"}',
  '{id:113,name:"BGPRanking",icon:"📊",cat:"domain",sub:"BGP",desc:"Ranking of Autonomous Systems (AS ) based on malicious activity.",tags:["free"],color:"#10B981",url:"https://bgpranking.circl.lu"}',
  '{id:114,name:"MalwareTech",icon:"🦠",cat:"domain",sub:"Botnet",desc:"Botnet tracking and threat intelligence visualization.",tags:["free"],color:"#10B981",url:"https://intel.malwaretech.com/"}',
  '{id:115,name:"BOTVRIJ",icon:"🤖",cat:"domain",sub:"Threats",desc:"Dutch threat intelligence platform with curated IOC lists.",tags:["free"],color:"#10B981",url:"http://www.botvrij.eu/"}',
  '{id:116,name:"Bambenek",icon:"🕷️",cat:"domain",sub:"C2",desc:"C2 IP masterlist and threat intelligence feeds.",tags:["free"],color:"#10B981",url:"http://osint.bambenekconsulting.com/feeds/c2-ipmasterlist.txt"}',
  '{id:117,name:"CertStream",icon:"📜",cat:"domain",sub:"Certs",desc:"Real-time stream of certificate transparency log data.",tags:["free","api"],color:"#10B981",url:"https://certstream.calidog.io/"}',
  '{id:118,name:"CCSS Forum",icon:"🛡️",cat:"domain",sub:"Malware",desc:"Malware certificate tracking and analysis forum.",tags:["free"],color:"#10B981",url:"http://www.ccssforum.org/malware-certificates.php"}',
  '{id:119,name:"CINS Score",icon:"🎯",cat:"domain",sub:"Reputation",desc:"IP reputation scoring and threat intelligence feeds.",tags:["free"],color:"#10B981",url:"http://cinsscore.com/#list"}',
  '{id:120,name:"Cisco Umbrella",icon:"☂️",cat:"domain",sub:"DNS",desc:"Cloud-based security platform providing DNS-layer protection.",tags:["free"],color:"#10B981",url:"http://s3-us-west-1.amazonaws.com/umbrella-static/index.html"}',
  '{id:121,name:"Cloudmersive",icon:"☁️",cat:"domain",sub:"VirusAPI",desc:"Virus scanning API for files and URLs with multi-engine support.",tags:["api","free"],color:"#10B981",url:"https://cloudmersive.com/virus-api"}',
  '{id:122,name:"Critical Stack",icon:"📚",cat:"domain",sub:"Threats",desc:"Threat intelligence marketplace and orchestration platform.",tags:["free"],color:"#10B981",url:"https://intelstack.com/"}',
  '{id:123,name:"CrowdSec",icon:"🛡️",cat:"domain",sub:"Reputation",desc:"Collaborative firewall and IP reputation network.",tags:["free","api"],color:"#10B981",url:"https://app.crowdsec.net/"}',
  '{id:124,name:"Cyber Cure",icon:"💊",cat:"domain",sub:"Threats",desc:"AI-driven threat intelligence and IOC search engine.",tags:["free","api"],color:"#10B981",url:"https://www.cybercure.ai/"}',
  '{id:125,name:"Cyware",icon:"🌐",cat:"domain",sub:"Feeds",desc:"Community threat intelligence feeds and security orchestration.",tags:["free"],color:"#10B981",url:"https://cyware.com/community/ctix-feeds"}',
  '{id:126,name:"DataPlane",icon:"✈️",cat:"domain",sub:"Feeds",desc:"Aggregated threat intelligence feeds from multiple sources.",tags:["free"],color:"#10B981",url:"https://dataplane.org/"}',
  '{id:127,name:"Focsec",icon:"🔍",cat:"domain",sub:"IP",desc:"IP intelligence and reputation lookup service.",tags:["free","api"],color:"#10B981",url:"https://focsec.com"}',
  '{id:128,name:"DigitalSide",icon:"🇮🇹",cat:"domain",sub:"Threats",desc:"Italian threat intelligence platform with malware and IOC lists.",tags:["free"],color:"#10B981",url:"https://osint.digitalside.it/"}',
  '{id:129,name:"Emerging Threats",icon:"🚨",cat:"domain",sub:"Rules",desc:"Open-source IDS rules and threat intelligence feeds.",tags:["free"],color:"#10B981",url:"http://rules.emergingthreats.net/fwrules/"}',
  '{id:130,name:"FastIntercept",icon:"⚡",cat:"domain",sub:"Threats",desc:"Real-time threat intelligence and IOC lists.",tags:["free"],color:"#10B981",url:"https://intercept.sh/threatlists/"}',
  '{id:131,name:"Feodo Tracker",icon:"🦠",cat:"domain",sub:"Botnet",desc:"Tracking of Feodo botnet C2 servers and malware.",tags:["free"],color:"#10B981",url:"https://feodotracker.abuse.ch/"}',
  '{id:132,name:"FireHOL",icon:"🔥",cat:"domain",sub:"IPLists",desc:"Aggregated IP blocklists from over 400 sources.",tags:["free"],color:"#10B981",url:"http://iplists.firehol.org/"}',
  '{id:133,name:"FraudGuard",icon:"🛡️",cat:"domain",sub:"IP",desc:"IP reputation and fraud detection API.",tags:["api","free"],color:"#10B981",url:"https://fraudguard.io/"}',
  '{id:134,name:"HoneyDB",icon:"🍯",cat:"domain",sub:"Honeypot",desc:"Honeypot data and threat intelligence search engine.",tags:["free","api"],color:"#10B981",url:"https://riskdiscovery.com/honeydb/"}',
  '{id:135,name:"InQuest Labs",icon:"🔬",cat:"domain",sub:"Threats",desc:"Threat intelligence and malware analysis laboratory.",tags:["free","api"],color:"#10B981",url:"https://labs.inquest.net"}',
  '{id:136,name:"I-Blocklist",icon:"🚫",cat:"domain",sub:"IPLists",desc:"Provider of IP blocklists for various security purposes.",tags:["free"],color:"#10B981",url:"https://www.iblocklist.com/lists"}',
  '{id:137,name:"IPsum",icon:"📝",cat:"domain",sub:"IPLists",desc:"Aggregated IP reputation list based on 30+ sources.",tags:["free"],color:"#10B981",url:"https://raw.githubusercontent.com/stamparm/ipsum/master/ipsum.txt"}',
  '{id:138,name:"Malpedia",icon:"📚",cat:"domain",sub:"Malware",desc:"Curated encyclopedia of malware families and samples.",tags:["free"],color:"#10B981",url:"https://malpedia.caad.fkie.fraunhofer.de/"}',
  '{id:139,name:"MalShare",icon:"🤝",cat:"domain",sub:"Malware",desc:"Collaborative malware sample sharing platform.",tags:["free","api"],color:"#10B981",url:"http://www.malshare.com/"}',
  '{id:140,name:"Maltiverse",icon:"🌌",cat:"domain",sub:"Threats",desc:"Threat intelligence platform for investigating IPs, domains, and URLs.",tags:["free","api"],color:"#10B981",url:"https://www.maltiverse.com/"}',
  '{id:141,name:"OpenPhish",icon:"🎣",cat:"domain",sub:"Phishing",desc:"Real-time phishing intelligence and URL feeds.",tags:["free"],color:"#10B981",url:"https://openphish.com/phishing_feeds.html"}',
  '{id:142,name:"RST Cloud",icon:"☁️",cat:"domain",sub:"Threats",desc:"Threat intelligence platform with aggregated IOC feeds.",tags:["free","api"],color:"#10B981",url:"https://rstcloud.net/"}',
  '{id:143,name:"Spamhaus",icon:"🚫",cat:"domain",sub:"Spam",desc:"Provider of real-time anti-spam and threat intelligence feeds.",tags:["free"],color:"#10B981",url:"https://www.spamhaus.org/"}',
  '{id:144,name:"SSL Blacklist",icon:"📜",cat:"domain",sub:"Certs",desc:"Tracking of malicious SSL certificates and C2 servers.",tags:["free"],color:"#10B981",url:"https://sslbl.abuse.ch/"}',
  '{id:145,name:"ThreatFox",icon:"🦊",cat:"domain",sub:"Malware",desc:"Platform for sharing and investigating malware IOCs.",tags:["free","api"],color:"#10B981",url:"https://threatfox.abuse.ch/"}',
  '{id:146,name:"Threat Jammer",icon:"📡",cat:"domain",sub:"Threats",desc:"Threat intelligence and IP reputation API.",tags:["api","free"],color:"#10B981",url:"https://threatjammer.com"}',
  '{id:147,name:"XFE",icon:"✖️",cat:"domain",sub:"Threats",desc:"IBM X-Force Exchange for threat intelligence and collaboration.",tags:["free","api"],color:"#10B981",url:"https://exchange.xforce.ibmcloud.com/"}',
  '{id:148,name:"Cloudflare Radar",icon:"📡",cat:"domain",sub:"Traffic",desc:"Internet traffic trends and security insights from Cloudflare.",tags:["free"],color:"#10B981",url:"https://radar.cloudflare.com/traffic"}',
  '{id:149,name:"Zoom Earth",icon:"🌍",cat:"geo",sub:"Satellite",desc:"Real-time satellite imagery and weather maps with METAR overlay.",tags:["free"],color:"#EF4444",url:"https://zoom.earth"}',
  '{id:150,name:"OpenCelliD",icon:"🗼",cat:"geo",sub:"CellTowers",desc:"World largest open database of cell towers and locations.",tags:["free","api"],color:"#EF4444",url:"https://www.opencellid.org"}',
  '{id:151,name:"Ventusky",icon:"🌪️",cat:"geo",sub:"Weather",desc:"Interactive weather maps with real-time data and forecasts.",tags:["free"],color:"#EF4444",url:"https://www.ventusky.com"}',
  '{id:152,name:"Opentopia",icon:"📷",cat:"geo",sub:"Webcams",desc:"Directory of public webcams from around the world.",tags:["free"],color:"#EF4444",url:"http://www.opentopia.com"}',
  '{id:153,name:"WorldCam",icon:"🌍",cat:"geo",sub:"Webcams",desc:"Search engine for finding public webcams globally.",tags:["free"],color:"#EF4444",url:"https://worldcam.eu"}',
  '{id:154,name:"Webcam Galore",icon:"🎥",cat:"geo",sub:"Webcams",desc:"Comprehensive directory of webcams categorized by location.",tags:["free"],color:"#EF4444",url:"https://www.webcamgalore.com"}',
  '{id:155,name:"OpenTrafficCamMap",icon:"🚦",cat:"geo",sub:"Traffic",desc:"Map of public traffic cameras for real-time monitoring.",tags:["free"],color:"#EF4444",url:"https://otc.armchairresearch.org/map"}',
  '{id:156,name:"KrooozCams",icon:"🚢",cat:"geo",sub:"Webcams",desc:"Directory of webcams from cruise ships and maritime locations.",tags:["free"],color:"#EF4444",url:"https://www.kroooz-cams.com"}',
  '{id:157,name:"Skyline Webcams",icon:"🏙️",cat:"geo",sub:"Webcams",desc:"High-quality live webcams from iconic locations worldwide.",tags:["free"],color:"#EF4444",url:"https://www.skylinewebcams.com/en/webcm"}',
  '{id:158,name:"Pictimo",icon:"🖼️",cat:"geo",sub:"Webcams",desc:"Visual directory of public webcams and live streams.",tags:["free"],color:"#EF4444",url:"https://www.pictimo.com"}',
  '{id:159,name:"CamHacker",icon:"🕵️",cat:"geo",sub:"Webcams",desc:"Search engine for finding exposed and public webcams.",tags:["free"],color:"#EF4444",url:"https://www.camhacker.com"}',
  '{id:160,name:"SUNDERS",icon:"📹",cat:"geo",sub:"Webcams",desc:"Surveillance camera search engine and directory.",tags:["free"],color:"#EF4444",url:"https://sunders.uber.space"}',
  '{id:161,name:"Ukraine Live Cams",icon:"🇺🇦",cat:"geo",sub:"Webcams",desc:"Live webcams from various locations in Ukraine.",tags:["free"],color:"#EF4444",url:"https://nagix.github.io/ukraine-livecams"}',
  '{id:162,name:"FleetMon",icon:"🚢",cat:"geo",sub:"Maritime",desc:"Vessel tracking and maritime intelligence platform.",tags:["freemium","api"],color:"#EF4444",url:"https://www.fleetmon.com"}',
  '{id:163,name:"ShipSpotting",icon:"📸",cat:"geo",sub:"Maritime",desc:"World largest ship photo database and community.",tags:["free"],color:"#EF4444",url:"http://www.shipspotting.com"}',
  '{id:164,name:"ExifTool",icon:"🛠️",cat:"geo",sub:"Metadata",desc:"Powerful command-line tool for reading and writing metadata in files.",tags:["free","open-source"],color:"#EF4444",url:"https://exiftool.org"}',
  '{id:165,name:"FOCA",icon:"🦭",cat:"geo",sub:"Metadata",desc:"Tool for finding metadata and hidden information in documents.",tags:["free","open-source"],color:"#EF4444",url:"https://github.com/ElevenPaths/FOCA"}',
  '{id:166,name:"Metagoofil",icon:"📄",cat:"geo",sub:"Metadata",desc:"OSINT tool for extracting metadata of public documents from a domain.",tags:["free","open-source"],color:"#EF4444",url:"https://github.com/laramies/metagoofil"}',
  '{id:167,name:"LeakCheck",icon:"💧",cat:"breach",sub:"Credentials",desc:"Search engine for leaked accounts and passwords by email or username.",tags:["freemium","api"],color:"#F97316",url:"https://leakcheck.io"}',
  '{id:168,name:"Hudson Rock",icon:"🪨",cat:"breach",sub:"Infostealers",desc:"Compromised credentials and infostealer data from cybercrime intelligence.",tags:["free","api"],color:"#F97316",url:"https://hudsonrock.com"}',
  '{id:169,name:"BreachDirectory",icon:"📂",cat:"breach",sub:"Search",desc:"Search engine for data breaches with email and username lookup.",tags:["freemium","api"],color:"#F97316",url:"https://breachdirectory.org"}',
  '{id:170,name:"Psbdmp",icon:"📋",cat:"breach",sub:"Paste",desc:"Search pastebin and other paste sites for leaked credentials and data.",tags:["free"],color:"#F97316",url:"https://psbdmp.ws"}',
  '{id:171,name:"IntelligenceX",icon:"🗄️",cat:"breach",sub:"Archive",desc:"Search engine for dark web, leaks, document libraries, and historical data.",tags:["api","paid"],color:"#F97316",url:"https://intelx.io"}',
  '{id:172,name:"BlockCypher",icon:"⛓️",cat:"crypto",sub:"Blockchain",desc:"Blockchain web services and explorer for multiple cryptocurrencies.",tags:["api","free"],color:"#84CC16",url:"https://live.blockcypher.com"}',
  '{id:173,name:"Blockchain.info",icon:"₿",cat:"crypto",sub:"Bitcoin",desc:"Bitcoin blockchain explorer with wallet balance and transaction data.",tags:["api","free"],color:"#84CC16",url:"https://blockchain.info"}',
  '{id:174,name:"OnionScan",icon:"🧅",cat:"dark",sub:"Scanner",desc:"Tool for investigating and scanning services on the dark web.",tags:["free","open-source"],color:"#6B7280",url:"https://github.com/s-rah/onionscan"}',
  '{id:175,name:"DarkDump",icon:"🗑️",cat:"dark",sub:"Scraper",desc:"Onion search engine and scraper for finding content on the dark web.",tags:["free","open-source"],color:"#6B7280",url:"https://github.com/josh0xA/darkdump"}',
  '{id:176,name:"Torch",icon:"🔥",cat:"dark",sub:"Search",desc:"One of the oldest and most popular search engines on the Tor network.",tags:["free"],color:"#6B7280",url:"(only .onion )"}',
  '{id:177,name:"Tor Project",icon:"🧅",cat:"dark",sub:"Tor",desc:"Official website of the Tor Project, providing tools for online anonymity.",tags:["free"],color:"#6B7280",url:"https://torproject.org"}',
  '{id:178,name:"Ahmia",icon:"🔍",cat:"dark",sub:"Search",desc:"Search engine for onion services accessible via Tor browser.",tags:["free"],color:"#6B7280",url:"https://ahmia.fi"}',
  '{id:179,name:"Dark.fail",icon:"❌",cat:"dark",sub:"Directory",desc:"Status checker and directory of dark web services and markets.",tags:["free"],color:"#6B7280",url:"https://dark.fail"}',
  '{id:180,name:"Ubikron",icon:"🧠",cat:"framework",sub:"AI",desc:"AI-powered case management and entity extraction browser extension.",tags:["free"],color:"#14B8A6",url:"https://ubikron.com"}',
  '{id:181,name:"OSRFramework",icon:"🇪🇸",cat:"framework",sub:"Spanish",desc:"Suite of OSINT tools developed in Spanish for various investigations.",tags:["free","open-source"],color:"#14B8A6",url:"https://github.com/i3visio/osrframework"}',
  '{id:182,name:"SpiderFoot",icon:"🕷️",cat:"framework",sub:"Automated",desc:"Automated OSINT platform with 200+ modules for threat intelligence.",tags:["free","open-source"],color:"#14B8A6",url:"https://spiderfoot.net"}',
  '{id:183,name:"Recon-ng",icon:"💻",cat:"framework",sub:"Terminal",desc:"Full-featured web reconnaissance framework with modular architecture.",tags:["free","open-source"],color:"#14B8A6",url:"https://github.com/lanmaster53/recon-ng"}',
  '{id:184,name:"HyperVerge",icon:"🤖",cat:"verify",sub:"Deepfake",desc:"AI-powered deepfake detection and identity verification platform.",tags:["api","paid"],color:"#EC4899",url:"https://hyperverge.co"}',
  '{id:185,name:"Sensity AI",icon:"👁️",cat:"verify",sub:"Deepfake",desc:"Professional deepfake detection and visual threat intelligence.",tags:["paid"],color:"#EC4899",url:"https://sensity.ai"}',
  '{id:186,name:"Content Authenticity",icon:"✅",cat:"verify",sub:"Origin",desc:"Standard for digital content provenance and authenticity verification.",tags:["free"],color:"#EC4899",url:"https://contentauthenticity.org"}',
  '{id:187,name:"InVID & WeVerify",icon:"📹",cat:"verify",sub:"Video",desc:"Verification plugin for images and videos. Reverse search and metadata.",tags:["free"],color:"#EC4899",url:"https://weverify.eu"}',
  '{id:188,name:"FotoForensics",icon:"🖼️",cat:"verify",sub:"Image",desc:"Metadata and error level analysis for digital forensics image examination.",tags:["free"],color:"#EC4899",url:"https://fotoforensics.com"}',
  '{id:189,name:"Forensically",icon:"🔍",cat:"verify",sub:"Image",desc:"Image forensics tool with magnifier, clone detection, and noise analysis.",tags:["free"],color:"#EC4899",url:"https://29a.ch/photo-forensics"}',
  '{id:190,name:"TinEye",icon:"👁️",cat:"verify",sub:"Image",desc:"Reverse image search engine to find where an image appears online.",tags:["freemium","api"],color:"#EC4899",url:"https://tineye.com"}'
];

const oldTools = oldToolsStr.map((str) => eval('(' + str + ')'));

const currentFile = fs.readFileSync("src/data/osint-tools.ts", "utf8");
const startIndex = currentFile.indexOf("export const TOOLS = [");
const endIndex = currentFile.indexOf("];", startIndex);

if(startIndex !== -1 && endIndex !== -1) {
  const jsonArrStr = currentFile.substring(startIndex + 21, endIndex + 1);
  const newToolsObj = JSON.parse(jsonArrStr.trim());
  
  let finalTools = [...oldTools];
  let currentMaxId = Math.max(...finalTools.map(t => t.id || 0));
  
  newToolsObj.forEach(t => {
     const exists = finalTools.find(existing => existing.name.toLowerCase() === t.name.toLowerCase() || existing.url === t.url);
     if(!exists) {
        currentMaxId++;
        t.id = currentMaxId;
        finalTools.push(t);
     }
  });

  const bodyData = 
  "export const TOOLS = " + JSON.stringify(finalTools, null, 2) + ";\\n\\n" +
  "export const CAT_LABELS: Record<string, string> = {\\n" +
  "  all: 'All Intelligence',\\n" +
  "  search: 'Search & Discovery',\\n" +
  "  social: 'Social Media Intel',\\n" +
  "  email: 'Email & Phone',\\n" +
  "  domain: 'Domain & IP',\\n" +
  "  geo: 'GEOINT & Imagery',\\n" +
  "  breach: 'Breach & Leaks',\\n" +
  "  crypto: 'Blockchain',\\n" +
  "  dark: 'Dark Web',\\n" +
  "  transport: 'Transport',\\n" +
  "  verify: 'Content Verify',\\n" +
  "  framework: 'Frameworks',\\n" +
  "  leaks: 'Leaks & Breaches',\\n" +
  "  financial: 'Financial & Corporate',\\n" +
  "  public: 'Public Records & Academic',\\n" +
  "  socmint: 'SOCMINT & People',\\n" +
  "  darkweb: 'Dark Web & Threat Intel',\\n" +
  "  cyber: 'Cyber Ops & Infra'\\n" +
  "};\\n\\n" +
  "export const CAT_COLORS: Record<string, string> = {\\n" +
  "  search: '#3B82F6',\\n" +
  "  social: '#8B5CF6',\\n" +
  "  email: '#F59E0B',\\n" +
  "  domain: '#10B981',\\n" +
  "  geo: '#EF4444',\\n" +
  "  breach: '#F97316',\\n" +
  "  crypto: '#84CC16',\\n" +
  "  dark: '#6B7280',\\n" +
  "  transport: '#06B6D4',\\n" +
  "  verify: '#EC4899',\\n" +
  "  framework: '#14B8A6',\\n" +
  "  leaks: '#F97316',\\n" +
  "  financial: '#F59E0B',\\n" +
  "  public: '#3B82F6',\\n" +
  "  socmint: '#8B5CF6',\\n" +
  "  darkweb: '#6B7280',\\n" +
  "  cyber: '#10B981'\\n" +
  "};\\n";
  
  fs.writeFileSync('src/data/osint-tools.ts', bodyData);
  console.log("Merged! Total tools: " + finalTools.length);
}
