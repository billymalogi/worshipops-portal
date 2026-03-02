import React, { useState, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import {
  Plus, Music, Search, X, Trash2, Save,
  ExternalLink, BookOpen, Check, Edit2,
} from 'lucide-react';

// â”€â”€â”€ 25 Public Domain Hymns â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// All published before 1928 (US public domain) and authors deceased.
const PD_HYMNS = [
  {
    title: 'Amazing Grace',
    artist: 'John Newton',
    key: 'G', bpm: 72, year: 1779, is_public_domain: true,
    lyrics: `[Verse 1]
Amazing grace how sweet the sound
That saved a wretch like me
I once was lost but now am found
Was blind but now I see

[Verse 2]
'Twas grace that taught my heart to fear
And grace my fears relieved
How precious did that grace appear
The hour I first believed

[Verse 3]
Through many dangers toils and snares
I have already come
'Tis grace hath brought me safe thus far
And grace will lead me home

[Verse 4]
When we've been there ten thousand years
Bright shining as the sun
We've no less days to sing God's praise
Than when we'd first begun`,
  },
  {
    title: 'Holy Holy Holy',
    artist: 'Reginald Heber',
    key: 'Bb', bpm: 84, year: 1861, is_public_domain: true,
    lyrics: `[Verse 1]
Holy holy holy Lord God Almighty
Early in the morning our song shall rise to thee
Holy holy holy merciful and mighty
God in three persons blessed Trinity

[Verse 2]
Holy holy holy all the saints adore thee
Casting down their golden crowns around the glassy sea
Cherubim and seraphim falling down before thee
Which wert and art and evermore shalt be

[Verse 3]
Holy holy holy though the darkness hide thee
Though the eye of sinful man thy glory may not see
Only thou art holy there is none beside thee
Perfect in power in love and purity

[Verse 4]
Holy holy holy Lord God Almighty
All thy works shall praise thy name in earth and sky and sea
Holy holy holy merciful and mighty
God in three persons blessed Trinity`,
  },
  {
    title: 'Blessed Assurance',
    artist: 'Fanny Crosby',
    key: 'D', bpm: 108, year: 1873, is_public_domain: true,
    lyrics: `[Verse 1]
Blessed assurance Jesus is mine
O what a foretaste of glory divine
Heir of salvation purchase of God
Born of his Spirit washed in his blood

[Chorus]
This is my story this is my song
Praising my Savior all the day long
This is my story this is my song
Praising my Savior all the day long

[Verse 2]
Perfect submission perfect delight
Visions of rapture now burst on my sight
Angels descending bring from above
Echoes of mercy whispers of love

[Verse 3]
Perfect submission all is at rest
I in my Savior am happy and blest
Watching and waiting looking above
Filled with his goodness lost in his love`,
  },
  {
    title: 'Great Is Thy Faithfulness',
    artist: 'Thomas Chisholm',
    key: 'D', bpm: 80, year: 1923, is_public_domain: true,
    lyrics: `[Verse 1]
Great is thy faithfulness O God my Father
There is no shadow of turning with thee
Thou changest not thy compassions they fail not
As thou hast been thou forever wilt be

[Chorus]
Great is thy faithfulness great is thy faithfulness
Morning by morning new mercies I see
All I have needed thy hand hath provided
Great is thy faithfulness Lord unto me

[Verse 2]
Summer and winter and springtime and harvest
Sun moon and stars in their courses above
Join with all nature in manifold witness
To thy great faithfulness mercy and love

[Verse 3]
Pardon for sin and a peace that endureth
Thine own dear presence to cheer and to guide
Strength for today and bright hope for tomorrow
Blessings all mine with ten thousand beside`,
  },
  {
    title: 'Be Thou My Vision',
    artist: 'Irish Hymn (trans. Mary Byrne)',
    key: 'D', bpm: 76, year: 1912, is_public_domain: true,
    lyrics: `[Verse 1]
Be thou my vision O Lord of my heart
Naught be all else to me save that thou art
Thou my best thought by day or by night
Waking or sleeping thy presence my light

[Verse 2]
Be thou my wisdom and thou my true word
I ever with thee and thou with me Lord
Thou my great Father I thy true son
Thou in me dwelling and I with thee one

[Verse 3]
Riches I heed not nor man's empty praise
Thou mine inheritance now and always
Thou and thou only first in my heart
High King of heaven my treasure thou art

[Verse 4]
High King of heaven my victory won
May I reach heaven's joys O bright heaven's Sun
Heart of my own heart whatever befall
Still be my vision O Ruler of all`,
  },
  {
    title: 'Come Thou Fount of Every Blessing',
    artist: 'Robert Robinson',
    key: 'D', bpm: 76, year: 1758, is_public_domain: true,
    lyrics: `[Verse 1]
Come thou fount of every blessing
Tune my heart to sing thy grace
Streams of mercy never ceasing
Call for songs of loudest praise
Teach me some melodious sonnet
Sung by flaming tongues above
Praise the mount I'm fixed upon it
Mount of thy redeeming love

[Verse 2]
Here I raise my Ebenezer
Hither by thy help I'm come
And I hope by thy good pleasure
Safely to arrive at home
Jesus sought me when a stranger
Wandering from the fold of God
He to rescue me from danger
Interposed his precious blood

[Verse 3]
O to grace how great a debtor
Daily I'm constrained to be
Let thy goodness like a fetter
Bind my wandering heart to thee
Prone to wander Lord I feel it
Prone to leave the God I love
Here's my heart O take and seal it
Seal it for thy courts above`,
  },
  {
    title: 'It Is Well with My Soul',
    artist: 'Horatio Spafford',
    key: 'G', bpm: 84, year: 1873, is_public_domain: true,
    lyrics: `[Verse 1]
When peace like a river attendeth my way
When sorrows like sea billows roll
Whatever my lot thou hast taught me to say
It is well it is well with my soul

[Chorus]
It is well with my soul
It is well it is well with my soul

[Verse 2]
Though Satan should buffet though trials should come
Let this blest assurance control
That Christ has regarded my helpless estate
And hath shed his own blood for my soul

[Verse 3]
My sin O the bliss of this glorious thought
My sin not in part but the whole
Is nailed to the cross and I bear it no more
Praise the Lord praise the Lord O my soul

[Verse 4]
And Lord haste the day when the faith shall be sight
The clouds be rolled back as a scroll
The trump shall resound and the Lord shall descend
Even so it is well with my soul`,
  },
  {
    title: 'Crown Him with Many Crowns',
    artist: 'Matthew Bridges & Godfrey Thring',
    key: 'G', bpm: 96, year: 1851, is_public_domain: true,
    lyrics: `[Verse 1]
Crown him with many crowns
The Lamb upon his throne
Hark how the heavenly anthem drowns
All music but its own
Awake my soul and sing
Of him who died for thee
And hail him as thy matchless King
Through all eternity

[Verse 2]
Crown him the Lord of life
Who triumphed o'er the grave
And rose victorious in the strife
For those he came to save
His glories now we sing
Who died and rose on high
Who died eternal life to bring
And lives that death may die

[Verse 3]
Crown him the Lord of years
The Potentate of time
Creator of the rolling spheres
Ineffably sublime
All hail Redeemer hail
For thou hast died for me
Thy praise shall never never fail
Throughout eternity`,
  },
  {
    title: 'A Mighty Fortress Is Our God',
    artist: 'Martin Luther',
    key: 'D', bpm: 88, year: 1529, is_public_domain: true,
    lyrics: `[Verse 1]
A mighty fortress is our God
A bulwark never failing
Our helper he amid the flood
Of mortal ills prevailing
For still our ancient foe
Doth seek to work us woe
His craft and power are great
And armed with cruel hate
On earth is not his equal

[Verse 2]
Did we in our own strength confide
Our striving would be losing
Were not the right man on our side
The man of God's own choosing
Dost ask who that may be
Christ Jesus it is he
Lord Sabaoth his name
From age to age the same
And he must win the battle

[Verse 3]
And though this world with devils filled
Should threaten to undo us
We will not fear for God hath willed
His truth to triumph through us
The prince of darkness grim
We tremble not for him
His rage we can endure
For lo his doom is sure
One little word shall fell him

[Verse 4]
That word above all earthly powers
No thanks to them abideth
The Spirit and the gifts are ours
Through him who with us sideth
Let goods and kindred go
This mortal life also
The body they may kill
God's truth abideth still
His kingdom is forever`,
  },
  {
    title: 'When I Survey the Wondrous Cross',
    artist: 'Isaac Watts',
    key: 'E', bpm: 72, year: 1707, is_public_domain: true,
    lyrics: `[Verse 1]
When I survey the wondrous cross
On which the Prince of glory died
My richest gain I count but loss
And pour contempt on all my pride

[Verse 2]
Forbid it Lord that I should boast
Save in the death of Christ my God
All the vain things that charm me most
I sacrifice them to his blood

[Verse 3]
See from his head his hands his feet
Sorrow and love flow mingled down
Did e'er such love and sorrow meet
Or thorns compose so rich a crown

[Verse 4]
Were the whole realm of nature mine
That were an offering far too small
Love so amazing so divine
Demands my soul my life my all`,
  },
  {
    title: 'The Old Rugged Cross',
    artist: 'George Bennard',
    key: 'F', bpm: 76, year: 1912, is_public_domain: true,
    lyrics: `[Verse 1]
On a hill far away stood an old rugged cross
The emblem of suffering and shame
And I love that old cross where the dearest and best
For a world of lost sinners was slain

[Chorus]
So I'll cherish the old rugged cross
Till my trophies at last I lay down
I will cling to the old rugged cross
And exchange it some day for a crown

[Verse 2]
O that old rugged cross so despised by the world
Has a wondrous attraction for me
For the dear Lamb of God left his glory above
To bear it to dark Calvary

[Verse 3]
To the old rugged cross I will ever be true
Its shame and reproach gladly bear
Then he'll call me some day to my home far away
Where his glory forever I'll share`,
  },
  {
    title: 'Nothing But the Blood',
    artist: 'Robert Lowry',
    key: 'G', bpm: 80, year: 1876, is_public_domain: true,
    lyrics: `[Verse 1]
What can wash away my sin
Nothing but the blood of Jesus
What can make me whole again
Nothing but the blood of Jesus

[Chorus]
Oh precious is the flow
That makes me white as snow
No other fount I know
Nothing but the blood of Jesus

[Verse 2]
For my pardon this I see
Nothing but the blood of Jesus
For my cleansing this my plea
Nothing but the blood of Jesus

[Verse 3]
Nothing can for sin atone
Nothing but the blood of Jesus
Naught of good that I have done
Nothing but the blood of Jesus

[Verse 4]
This is all my hope and peace
Nothing but the blood of Jesus
This is all my righteousness
Nothing but the blood of Jesus`,
  },
  {
    title: 'How Firm a Foundation',
    artist: 'John Rippon',
    key: 'D', bpm: 84, year: 1787, is_public_domain: true,
    lyrics: `[Verse 1]
How firm a foundation ye saints of the Lord
Is laid for your faith in his excellent word
What more can he say than to you he hath said
To you who for refuge to Jesus have fled

[Verse 2]
Fear not I am with thee O be not dismayed
For I am thy God and will still give thee aid
I'll strengthen thee help thee and cause thee to stand
Upheld by my righteous omnipotent hand

[Verse 3]
When through the deep waters I call thee to go
The rivers of sorrow shall not overflow
For I will be with thee thy troubles to bless
And sanctify to thee thy deepest distress

[Verse 4]
The soul that on Jesus hath leaned for repose
I will not I will not desert to its foes
That soul though all hell should endeavor to shake
I'll never no never no never forsake`,
  },
  {
    title: 'Jesus Loves Me',
    artist: 'Anna Warner',
    key: 'D', bpm: 88, year: 1860, is_public_domain: true,
    lyrics: `[Verse 1]
Jesus loves me this I know
For the Bible tells me so
Little ones to him belong
They are weak but he is strong

[Chorus]
Yes Jesus loves me
Yes Jesus loves me
Yes Jesus loves me
The Bible tells me so

[Verse 2]
Jesus loves me he who died
Heaven's gate to open wide
He will wash away my sin
Let his little child come in

[Verse 3]
Jesus loves me he will stay
Close beside me all the way
Thou hast bled and died for me
I will henceforth live for thee`,
  },
  {
    title: 'Praise to the Lord the Almighty',
    artist: 'Joachim Neander',
    key: 'G', bpm: 96, year: 1680, is_public_domain: true,
    lyrics: `[Verse 1]
Praise to the Lord the Almighty the King of creation
O my soul praise him for he is thy health and salvation
All ye who hear now to his temple draw near
Praise him in glad adoration

[Verse 2]
Praise to the Lord who o'er all things so wondrously reigneth
Shelters thee under his wings yea so gently sustaineth
Hast thou not seen how all you needeth hath been
Granted in what he ordaineth

[Verse 3]
Praise to the Lord who doth prosper thy work and defend thee
Surely his goodness and mercy here daily attend thee
Ponder anew what the Almighty can do
If with his love he befriend thee

[Verse 4]
Praise to the Lord O let all that is in me adore him
All that hath life and breath come now with praises before him
Let the amen sound from his people again
Gladly for aye we adore him`,
  },
  {
    title: 'Rock of Ages',
    artist: 'Augustus Toplady',
    key: 'G', bpm: 72, year: 1776, is_public_domain: true,
    lyrics: `[Verse 1]
Rock of ages cleft for me
Let me hide myself in thee
Let the water and the blood
From thy riven side which flowed
Be of sin the double cure
Save from wrath and make me pure

[Verse 2]
Not the labors of my hands
Can fulfill thy law's demands
Could my zeal no respite know
Could my tears forever flow
All for sin could not atone
Thou must save and thou alone

[Verse 3]
Nothing in my hand I bring
Simply to thy cross I cling
Naked come to thee for dress
Helpless look to thee for grace
Foul I to the fountain fly
Wash me Savior or I die

[Verse 4]
While I draw this fleeting breath
When mine eyes shall close in death
When I soar to worlds unknown
See thee on thy judgment throne
Rock of ages cleft for me
Let me hide myself in thee`,
  },
  {
    title: 'And Can It Be',
    artist: 'Charles Wesley',
    key: 'Bb', bpm: 88, year: 1738, is_public_domain: true,
    lyrics: `[Verse 1]
And can it be that I should gain
An interest in the Savior's blood
Died he for me who caused his pain
For me who him to death pursued
Amazing love how can it be
That thou my God shouldst die for me

[Chorus]
Amazing love how can it be
That thou my God shouldst die for me

[Verse 2]
He left his Father's throne above
So free so infinite his grace
Emptied himself of all but love
And bled for Adam's helpless race
'Tis mercy all immense and free
For O my God it found out me

[Verse 3]
Long my imprisoned spirit lay
Fast bound in sin and nature's night
Thine eye diffused a quickening ray
I woke the dungeon flamed with light
My chains fell off my heart was free
I rose went forth and followed thee

[Verse 4]
No condemnation now I dread
Jesus and all in him is mine
Alive in him my living Head
And clothed in righteousness divine
Bold I approach the eternal throne
And claim the crown through Christ my own`,
  },
  {
    title: "All Hail the Power of Jesus' Name",
    artist: 'Edward Perronet',
    key: 'F', bpm: 92, year: 1779, is_public_domain: true,
    lyrics: `[Verse 1]
All hail the power of Jesus' name
Let angels prostrate fall
Bring forth the royal diadem
And crown him Lord of all

[Verse 2]
Ye chosen seed of Israel's race
Ye ransomed from the fall
Hail him who saves you by his grace
And crown him Lord of all

[Verse 3]
Let every kindred every tribe
On this terrestrial ball
To him all majesty ascribe
And crown him Lord of all

[Verse 4]
O that with yonder sacred throng
We at his feet may fall
We'll join the everlasting song
And crown him Lord of all`,
  },
  {
    title: 'Joyful Joyful We Adore Thee',
    artist: 'Henry van Dyke',
    key: 'Bb', bpm: 100, year: 1907, is_public_domain: true,
    lyrics: `[Verse 1]
Joyful joyful we adore thee
God of glory Lord of love
Hearts unfold like flowers before thee
Opening to the sun above
Melt the clouds of sin and sadness
Drive the dark of doubt away
Giver of immortal gladness
Fill us with the light of day

[Verse 2]
All thy works with joy surround thee
Earth and heaven reflect thy rays
Stars and angels sing around thee
Center of unbroken praise
Field and forest vale and mountain
Flowering meadow flashing sea
Singing bird and flowing fountain
Call us to rejoice in thee

[Verse 3]
Thou art giving and forgiving
Ever blessing ever blest
Wellspring of the joy of living
Ocean depth of happy rest
Thou our Father Christ our brother
All who live in love are thine
Teach us how to love each other
Lift us to the joy divine`,
  },
  {
    title: 'To God Be the Glory',
    artist: 'Fanny Crosby',
    key: 'G', bpm: 96, year: 1875, is_public_domain: true,
    lyrics: `[Verse 1]
To God be the glory great things he hath done
So loved he the world that he gave us his Son
Who yielded his life an atonement for sin
And opened the life gate that all may go in

[Chorus]
Praise the Lord praise the Lord
Let the earth hear his voice
Praise the Lord praise the Lord
Let the people rejoice
O come to the Father through Jesus the Son
And give him the glory great things he hath done

[Verse 2]
O perfect redemption the purchase of blood
To every believer the promise of God
The vilest offender who truly believes
That moment from Jesus a pardon receives

[Verse 3]
Great things he hath taught us great things he hath done
And great our rejoicing through Jesus the Son
But purer and higher and greater will be
Our wonder our transport when Jesus we see`,
  },
  {
    title: 'My Jesus I Love Thee',
    artist: 'William Featherstone',
    key: 'G', bpm: 80, year: 1864, is_public_domain: true,
    lyrics: `[Verse 1]
My Jesus I love thee I know thou art mine
For thee all the follies of sin I resign
My gracious Redeemer my Savior art thou
If ever I loved thee my Jesus 'tis now

[Verse 2]
I love thee because thou hast first loved me
And purchased my pardon on Calvary's tree
I love thee for wearing the thorns on thy brow
If ever I loved thee my Jesus 'tis now

[Verse 3]
I'll love thee in life I will love thee in death
And praise thee as long as thou lendest me breath
And say when the death dew lies cold on my brow
If ever I loved thee my Jesus 'tis now

[Verse 4]
In mansions of glory and endless delight
I'll ever adore thee in heaven so bright
I'll sing with the glittering crown on my brow
If ever I loved thee my Jesus 'tis now`,
  },
  {
    title: 'O For a Thousand Tongues to Sing',
    artist: 'Charles Wesley',
    key: 'G', bpm: 92, year: 1739, is_public_domain: true,
    lyrics: `[Verse 1]
O for a thousand tongues to sing
My great Redeemer's praise
The glories of my God and King
The triumphs of his grace

[Verse 2]
My gracious Master and my God
Assist me to proclaim
To spread through all the earth abroad
The honors of thy name

[Verse 3]
Jesus the name that charms our fears
That bids our sorrows cease
'Tis music in the sinner's ears
'Tis life and health and peace

[Verse 4]
He breaks the power of cancelled sin
He sets the prisoner free
His blood can make the foulest clean
His blood availed for me`,
  },
  {
    title: 'Doxology',
    artist: 'Thomas Ken',
    key: 'G', bpm: 84, year: 1674, is_public_domain: true,
    lyrics: `[Doxology]
Praise God from whom all blessings flow
Praise him all creatures here below
Praise him above ye heavenly host
Praise Father Son and Holy Ghost
Amen`,
  },
  {
    title: "This Is My Father's World",
    artist: 'Maltbie Babcock',
    key: 'G', bpm: 84, year: 1901, is_public_domain: true,
    lyrics: `[Verse 1]
This is my Father's world
And to my listening ears
All nature sings and round me rings
The music of the spheres
This is my Father's world
I rest me in the thought
Of rocks and trees of skies and seas
His hand the wonders wrought

[Verse 2]
This is my Father's world
The birds their carols raise
The morning light the lily white
Declare their maker's praise
This is my Father's world
He shines in all that's fair
In the rustling grass I hear him pass
He speaks to me everywhere

[Verse 3]
This is my Father's world
O let me ne'er forget
That though the wrong seems oft so strong
God is the ruler yet
This is my Father's world
Why should my heart be sad
The Lord is King let the heavens ring
God reigns let earth be glad`,
  },
  {
    title: 'Fairest Lord Jesus',
    artist: 'German Hymn (1677)',
    key: 'F', bpm: 80, year: 1677, is_public_domain: true,
    lyrics: `[Verse 1]
Fairest Lord Jesus ruler of all nature
O thou of God and man the Son
Thee will I cherish thee will I honor
Thou my soul's glory joy and crown

[Verse 2]
Fair are the meadows fairer still the woodlands
Robed in the blooming garb of spring
Jesus is fairer Jesus is purer
Who makes the woeful heart to sing

[Verse 3]
Fair is the sunshine fairer still the moonlight
And all the twinkling starry host
Jesus shines brighter Jesus shines purer
Than all the angels heaven can boast

[Verse 4]
Beautiful Savior Lord of all the nations
Son of God and Son of Man
Glory and honor praise adoration
Now and forevermore be thine`,
  },
  {
    title: 'O Worship the King',
    artist: 'Robert Grant',
    key: 'G', bpm: 92, year: 1833, is_public_domain: true,
    lyrics: `[Verse 1]
O worship the King all glorious above
O gratefully sing his power and his love
Our Shield and Defender the Ancient of Days
Pavilioned in splendor and girded with praise

[Verse 2]
O tell of his might O sing of his grace
Whose robe is the light whose canopy space
His chariots of wrath the deep thunderclouds form
And dark is his path on the wings of the storm

[Verse 3]
Thy bountiful care what tongue can recite
It breathes in the air it shines in the light
It streams from the hills it descends to the plain
And sweetly distills in the dew and the rain

[Verse 4]
Frail children of dust and feeble as frail
In thee do we trust nor find thee to fail
Thy mercies how tender how firm to the end
Our Maker Defender Redeemer and Friend`,
  },
];

// â”€â”€â”€ Key options for the dropdown â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const KEY_OPTIONS = ['A', 'Bb', 'B', 'C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab'];

// â”€â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function SongsManager({ songs, isDarkMode, userRole, orgId, onRefresh }) {
  const [selectedSong, setSelectedSong] = useState(null);
  const [editMode, setEditMode]         = useState(false);
  const [editData, setEditData]         = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [seedLoading, setSeedLoading]   = useState(false);
  const [seedDone, setSeedDone]         = useState(false);
  const [saving, setSaving]             = useState(false);
  const [ccliOpen, setCcliOpen]         = useState(true);
  const [searchQuery, setSearchQuery]   = useState('');
  const [filterPD, setFilterPD]         = useState(false);
  const [form, setForm]                 = useState({
    title: '', artist: '', key: 'G', bpm: '', lyrics: '', is_public_domain: false,
  });

  const c = {
    bg:       isDarkMode ? '#0a0a0a' : '#f8f9fa',
    card:     isDarkMode ? '#0a0a0a' : '#ffffff',
    text:     isDarkMode ? '#8b949e' : '#6b7280',
    heading:  isDarkMode ? '#f0f6fc' : '#111111',
    border:   isDarkMode ? '#111111' : '#e1e4e8',
    hover:    isDarkMode ? '#1c2128' : '#f0f4f8',
    input:    isDarkMode ? '#0a0a0a' : '#f9fafb',
    primary:  '#3b82f6',
    success:  '#10b981',
    warning:  '#f59e0b',
    danger:   '#ef4444',
    muted:    isDarkMode ? '#6b7280' : '#9ca3af',
  };

  // â”€â”€ derived â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const pdCount = useMemo(() => songs.filter(s => s.is_public_domain).length, [songs]);

  const filtered = useMemo(() => {
    let list = filterPD ? songs.filter(s => s.is_public_domain) : songs;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(s =>
        s.title?.toLowerCase().includes(q) ||
        s.artist?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [songs, searchQuery, filterPD]);

  // â”€â”€ handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleAddSong = async () => {
    if (!form.title.trim()) return;
    const { error } = await supabase.from('songs').insert([{
      ...form,
      bpm: form.bpm ? parseInt(form.bpm) : null,
      organization_id: orgId,
    }]);
    if (error) { alert('Error: ' + error.message); return; }
    setShowAddModal(false);
    setForm({ title: '', artist: '', key: 'G', bpm: '', lyrics: '', is_public_domain: false });
    onRefresh();
  };

  const handleSeedHymns = async () => {
    if (!window.confirm(`Add ${PD_HYMNS.length} classic public domain hymns to your library?\n\nThese are all copyright-free — no license needed.`)) return;
    setSeedLoading(true);
    const records = PD_HYMNS.map(h => ({ ...h, organization_id: orgId }));
    const { error } = await supabase.from('songs').insert(records);
    setSeedLoading(false);
    if (error) {
      if (error.message?.includes('column')) {
        alert('Database columns are missing.\nRun the migration SQL from:\nCommand Center/supabase/add_song_fields.sql\n\nThen try again.');
      } else {
        alert('Error: ' + error.message);
      }
      return;
    }
    setSeedDone(true);
    onRefresh();
    setTimeout(() => setSeedDone(false), 4000);
  };

  const startEdit = () => {
    setEditData({ ...selectedSong });
    setEditMode(true);
  };

  const handleSaveEdit = async () => {
    if (!editData) return;
    setSaving(true);
    const { error } = await supabase.from('songs').update({
      title:            editData.title,
      artist:           editData.artist,
      key:              editData.key,
      bpm:              editData.bpm ? parseInt(editData.bpm) : null,
      lyrics:           editData.lyrics,
      is_public_domain: editData.is_public_domain,
    }).eq('id', editData.id);
    setSaving(false);
    if (error) { alert('Save error: ' + error.message); return; }
    setEditMode(false);
    setSelectedSong({ ...editData, bpm: editData.bpm ? parseInt(editData.bpm) : null });
    onRefresh();
  };

  const handleDeleteSong = async (id) => {
    if (!window.confirm('Delete this song from the library?')) return;
    await supabase.from('songs').delete().eq('id', id);
    setSelectedSong(null);
    setEditMode(false);
    onRefresh();
  };

  const selectSong = (s) => {
    setSelectedSong(s);
    setEditMode(false);
  };

  // â”€â”€ reusable input style â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const inp = {
    padding: '8px 10px', borderRadius: '6px',
    border: `1px solid ${c.border}`, background: c.input,
    color: c.heading, fontSize: '13px', outline: 'none', width: '100%', boxSizing: 'border-box',
  };

  // â”€â”€ render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: c.bg, overflow: 'hidden' }}>

      {/* â”€â”€ CCLI Banner â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {ccliOpen && (
        <div style={{
          background: isDarkMode ? '#0d2137' : '#eff6ff',
          borderBottom: `1px solid ${isDarkMode ? '#1e3a5f' : '#bfdbfe'}`,
          padding: '14px 24px',
          display: 'flex', gap: '20px', alignItems: 'flex-start', flexShrink: 0,
        }}>
          <div style={{ fontSize: '26px', flexShrink: 0, lineHeight: 1 }}>ðŸŽµ</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: '700', fontSize: '14px', color: isDarkMode ? '#93c5fd' : '#1d4ed8', marginBottom: '4px' }}>
              Unlock 4.5 Million+ Licensed Songs with CCLI SongSelect
            </div>
            <div style={{ fontSize: '12px', color: isDarkMode ? '#60a5fa' : '#3b82f6', lineHeight: '1.6', marginBottom: '10px' }}>
              Most churches already have a CCLI license — it lets you legally display copyrighted worship lyrics
              (Hillsong, Bethel, Elevation, etc.) in services. Go to SongSelect, search a song, copy the lyrics,
              then paste them into a new song here.
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <a
                href="https://www.ccli.com/"
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                  background: '#3b82f6', color: 'white', padding: '6px 14px',
                  borderRadius: '6px', fontSize: '12px', fontWeight: '600',
                  textDecoration: 'none',
                }}
              >
                <ExternalLink size={11} /> Get a CCLI License
              </a>
              <a
                href="https://songselect.ccli.com/"
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                  background: 'transparent',
                  border: `1px solid ${isDarkMode ? '#2563eb' : '#93c5fd'}`,
                  color: isDarkMode ? '#93c5fd' : '#2563eb',
                  padding: '6px 14px', borderRadius: '6px', fontSize: '12px',
                  fontWeight: '600', textDecoration: 'none',
                }}
              >
                <BookOpen size={11} /> Browse SongSelect
              </a>
            </div>
          </div>
          <button
            onClick={() => setCcliOpen(false)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.muted, padding: '2px', flexShrink: 0 }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* â”€â”€ Main layout â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* LEFT SIDEBAR */}
        <div style={{
          width: '220px', background: isDarkMode ? '#0a0a0a' : '#f8f9fa',
          borderRight: `1px solid ${c.border}`,
          display: 'flex', flexDirection: 'column', overflowY: 'auto', flexShrink: 0,
        }}>
          <div style={{ padding: '16px 16px 10px', borderBottom: `1px solid ${c.border}` }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: c.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
              Library
            </div>

            {/* All Songs */}
            <div
              onClick={() => { setFilterPD(false); setSelectedSong(null); }}
              style={{
                padding: '7px 10px', borderRadius: '5px', cursor: 'pointer', marginBottom: '2px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: !filterPD ? (isDarkMode ? '#1c2128' : '#e1e4e8') : 'transparent',
                color: !filterPD ? c.heading : c.text, fontWeight: !filterPD ? '600' : '500', fontSize: '13px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Music size={14} style={{ opacity: 0.7 }} /> All Songs
              </div>
              <span style={{ fontSize: '11px', opacity: 0.6 }}>{songs.length}</span>
            </div>

            {/* Classic Hymns filter */}
            <div
              onClick={() => { setFilterPD(true); setSelectedSong(null); }}
              style={{
                padding: '7px 10px', borderRadius: '5px', cursor: 'pointer', marginBottom: '2px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: filterPD ? (isDarkMode ? '#1c2128' : '#e1e4e8') : 'transparent',
                color: filterPD ? c.heading : c.text, fontWeight: filterPD ? '600' : '500', fontSize: '13px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BookOpen size={14} style={{ opacity: 0.7 }} /> Classic Hymns
              </div>
              <span style={{ fontSize: '11px', opacity: 0.6 }}>{pdCount}</span>
            </div>
          </div>

          {/* Seed hymns section */}
          {userRole === 'admin' && (
            <div style={{ padding: '14px 16px', borderBottom: `1px solid ${c.border}` }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: c.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                Free Starter Library
              </div>
              <p style={{ fontSize: '11px', color: c.text, lineHeight: '1.6', margin: '0 0 10px' }}>
                {PD_HYMNS.length} classic hymns — fully public domain, no license needed.
              </p>
              <button
                onClick={handleSeedHymns}
                disabled={seedLoading}
                style={{
                  width: '100%', padding: '8px', borderRadius: '6px', border: 'none',
                  background: seedDone ? c.success : isDarkMode ? '#1f1f22' : '#f3f4f6',
                  color: seedDone ? 'white' : c.heading,
                  fontSize: '12px', fontWeight: '600', cursor: seedLoading ? 'wait' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  transition: 'all 0.2s',
                }}
              >
                {seedDone
                  ? <><Check size={13} /> Added!</>
                  : seedLoading
                  ? 'Adding…'
                  : <><Plus size={13} /> Load {PD_HYMNS.length} Classic Hymns</>
                }
              </button>
            </div>
          )}
        </div>

        {/* SONG GRID */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Toolbar */}
          <div style={{
            padding: '12px 20px', borderBottom: `1px solid ${c.border}`,
            background: c.card, display: 'flex', gap: '10px', alignItems: 'center', flexShrink: 0,
          }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: '340px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: c.muted, pointerEvents: 'none' }} />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search songs or artists…"
                style={{ ...inp, paddingLeft: '32px' }}
              />
            </div>
            {userRole !== 'viewer' && (
              <button
                onClick={() => setShowAddModal(true)}
                style={{
                  background: c.primary, color: 'white', border: 'none',
                  padding: '8px 16px', borderRadius: '6px',
                  fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0,
                }}
              >
                <Plus size={14} /> Add Song
              </button>
            )}
          </div>

          {/* Songs list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: c.muted }}>
                <Music size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
                <div style={{ fontSize: '14px' }}>
                  {songs.length === 0
                    ? 'No songs yet. Add a song or load the classic hymns library.'
                    : 'No songs match your search.'}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {filtered.map(song => {
                  const isSelected = selectedSong?.id === song.id;
                  return (
                    <div
                      key={song.id}
                      onClick={() => selectSong(song)}
                      style={{
                        padding: '10px 14px', borderRadius: '8px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '12px',
                        background: isSelected
                          ? (isDarkMode ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.08)')
                          : 'transparent',
                        border: `1px solid ${isSelected ? c.primary : 'transparent'}`,
                        transition: 'all 0.12s',
                      }}
                      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = c.hover; }}
                      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <div style={{
                        width: '34px', height: '34px', borderRadius: '6px',
                        background: isDarkMode ? '#1f1f22' : '#f3f4f6',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        <Music size={15} color={c.primary} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontWeight: '600', fontSize: '13px', color: c.heading,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          {song.title}
                        </div>
                        <div style={{ fontSize: '11px', color: c.muted }}>
                          {song.artist && <span>{song.artist}</span>}
                          {song.artist && (song.key || song.bpm) && <span> · </span>}
                          {song.key && <span>{song.key}</span>}
                          {song.key && song.bpm && <span> · </span>}
                          {song.bpm && <span>{song.bpm} BPM</span>}
                        </div>
                      </div>
                      {song.is_public_domain && (
                        <span style={{
                          fontSize: '10px', padding: '2px 6px', borderRadius: '4px',
                          background: 'rgba(16,185,129,0.12)', color: c.success, flexShrink: 0,
                        }}>
                          PD
                        </span>
                      )}
                      {song.lyrics && (
                        <span style={{ fontSize: '10px', color: c.muted, flexShrink: 0 }}>â™©</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* SONG DETAIL PANEL */}
        {selectedSong && (
          <div style={{
            width: '360px', borderLeft: `1px solid ${c.border}`,
            background: c.card, display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0,
          }}>
            {/* Panel header */}
            <div style={{
              padding: '14px 16px', borderBottom: `1px solid ${c.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
            }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                {!editMode && userRole !== 'viewer' && (
                  <button onClick={startEdit} style={{
                    background: 'transparent', border: `1px solid ${c.border}`,
                    color: c.text, padding: '5px 10px', borderRadius: '6px',
                    fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '5px',
                  }}>
                    <Edit2 size={11} /> Edit
                  </button>
                )}
                {editMode && (
                  <>
                    <button onClick={handleSaveEdit} disabled={saving} style={{
                      background: c.primary, border: 'none', color: 'white',
                      padding: '5px 12px', borderRadius: '6px',
                      fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '5px',
                    }}>
                      <Save size={11} /> {saving ? 'Saving…' : 'Save'}
                    </button>
                    <button onClick={() => setEditMode(false)} style={{
                      background: 'transparent', border: `1px solid ${c.border}`,
                      color: c.text, padding: '5px 10px', borderRadius: '6px',
                      fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                    }}>
                      Cancel
                    </button>
                  </>
                )}
              </div>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                {userRole === 'admin' && !editMode && (
                  <button onClick={() => handleDeleteSong(selectedSong.id)} style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: c.danger, opacity: 0.6, padding: '4px',
                  }}>
                    <Trash2 size={14} />
                  </button>
                )}
                <button onClick={() => { setSelectedSong(null); setEditMode(false); }} style={{
                  background: 'none', border: 'none', cursor: 'pointer', color: c.muted, padding: '4px',
                }}>
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Panel body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '18px 16px' }}>
              {editMode ? (
                /* Edit form */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: '600', color: c.muted, display: 'block', marginBottom: '4px' }}>TITLE</label>
                    <input value={editData.title || ''} onChange={e => setEditData({ ...editData, title: e.target.value })} style={inp} />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: '600', color: c.muted, display: 'block', marginBottom: '4px' }}>ARTIST / COMPOSER</label>
                    <input value={editData.artist || ''} onChange={e => setEditData({ ...editData, artist: e.target.value })} style={inp} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: '600', color: c.muted, display: 'block', marginBottom: '4px' }}>KEY</label>
                      <select value={editData.key || ''} onChange={e => setEditData({ ...editData, key: e.target.value })} style={inp}>
                        <option value="">—</option>
                        {KEY_OPTIONS.map(k => <option key={k} value={k}>{k}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: '600', color: c.muted, display: 'block', marginBottom: '4px' }}>BPM</label>
                      <input type="number" value={editData.bpm || ''} onChange={e => setEditData({ ...editData, bpm: e.target.value })} placeholder="e.g. 80" style={inp} />
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: '600', color: c.muted, display: 'block', marginBottom: '4px' }}>LYRICS</label>
                    <div style={{ fontSize: '10px', color: c.muted, marginBottom: '6px', lineHeight: '1.5' }}>
                      Use <code style={{ background: isDarkMode ? '#27272a' : '#f3f4f6', padding: '1px 4px', borderRadius: '3px' }}>[Verse 1]</code>, <code style={{ background: isDarkMode ? '#27272a' : '#f3f4f6', padding: '1px 4px', borderRadius: '3px' }}>[Chorus]</code>, <code style={{ background: isDarkMode ? '#27272a' : '#f3f4f6', padding: '1px 4px', borderRadius: '3px' }}>[Bridge]</code> labels for sections.
                    </div>
                    <textarea
                      value={editData.lyrics || ''}
                      onChange={e => setEditData({ ...editData, lyrics: e.target.value })}
                      placeholder="Paste lyrics from SongSelect or type here…"
                      rows={16}
                      style={{ ...inp, resize: 'vertical', lineHeight: '1.7', fontFamily: 'monospace', fontSize: '12px' }}
                    />
                  </div>
                </div>
              ) : (
                /* View mode */
                <>
                  <div style={{ marginBottom: '16px' }}>
                    <h2 style={{ margin: '0 0 4px', fontSize: '20px', fontWeight: '700', color: c.heading }}>
                      {selectedSong.title}
                    </h2>
                    {selectedSong.artist && (
                      <div style={{ fontSize: '13px', color: c.muted, marginBottom: '10px' }}>
                        {selectedSong.artist}
                        {selectedSong.year ? ` · ${selectedSong.year}` : ''}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {selectedSong.key && (
                        <span style={{
                          fontSize: '12px', padding: '3px 10px', borderRadius: '20px',
                          background: isDarkMode ? '#1f1f22' : '#f3f4f6',
                          color: c.heading, fontWeight: '600',
                        }}>
                          Key of {selectedSong.key}
                        </span>
                      )}
                      {selectedSong.bpm && (
                        <span style={{
                          fontSize: '12px', padding: '3px 10px', borderRadius: '20px',
                          background: isDarkMode ? '#1f1f22' : '#f3f4f6',
                          color: c.heading, fontWeight: '600',
                        }}>
                          {selectedSong.bpm} BPM
                        </span>
                      )}
                      {selectedSong.is_public_domain && (
                        <span style={{
                          fontSize: '12px', padding: '3px 10px', borderRadius: '20px',
                          background: 'rgba(16,185,129,0.1)', color: c.success, fontWeight: '600',
                        }}>
                          Public Domain
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Lyrics */}
                  {selectedSong.lyrics ? (
                    <div style={{
                      fontSize: '13px', color: c.text, lineHeight: '1.8',
                      whiteSpace: 'pre-wrap', fontFamily: 'system-ui, sans-serif',
                    }}>
                      {selectedSong.lyrics.split('\n').map((line, i) => {
                        const isLabel = /^\[.+\]$/.test(line.trim());
                        return (
                          <div key={i} style={{
                            fontWeight: isLabel ? '700' : '400',
                            color: isLabel ? c.primary : c.text,
                            fontSize: isLabel ? '11px' : '13px',
                            textTransform: isLabel ? 'uppercase' : 'none',
                            letterSpacing: isLabel ? '0.5px' : 'normal',
                            marginTop: isLabel ? '14px' : '0',
                            marginBottom: isLabel ? '6px' : '0',
                          }}>
                            {line || '\u00A0'}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{
                      textAlign: 'center', padding: '30px 0',
                      color: c.muted, fontSize: '13px',
                    }}>
                      <Music size={28} style={{ opacity: 0.3, marginBottom: '8px' }} />
                      <div>No lyrics yet.</div>
                      {userRole !== 'viewer' && (
                        <div style={{ marginTop: '6px', fontSize: '12px' }}>
                          Click <strong>Edit</strong> to paste lyrics from{' '}
                          <a href="https://songselect.ccli.com/" target="_blank" rel="noreferrer"
                            style={{ color: c.primary }}>SongSelect</a>.
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* â”€â”€ ADD SONG MODAL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {showAddModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '20px',
        }}>
          <div style={{
            background: c.card, borderRadius: '12px',
            border: `1px solid ${c.border}`, width: '100%', maxWidth: '560px',
            maxHeight: '90vh', display: 'flex', flexDirection: 'column',
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          }}>
            {/* Modal header */}
            <div style={{
              padding: '16px 20px', borderBottom: `1px solid ${c.border}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0,
            }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: c.heading }}>Add Song</h3>
              <button onClick={() => setShowAddModal(false)} style={{
                background: 'none', border: 'none', cursor: 'pointer', color: c.muted,
              }}>
                <X size={18} />
              </button>
            </div>

            {/* Modal body */}
            <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>

              {/* CCLI tip */}
              <div style={{
                padding: '10px 14px', borderRadius: '8px',
                background: isDarkMode ? '#0d2137' : '#eff6ff',
                border: `1px solid ${isDarkMode ? '#1e3a5f' : '#bfdbfe'}`,
                fontSize: '12px', color: isDarkMode ? '#60a5fa' : '#2563eb', lineHeight: '1.6',
              }}>
                <strong>Tip:</strong> Search <a href="https://songselect.ccli.com/" target="_blank" rel="noreferrer"
                  style={{ color: 'inherit', fontWeight: '700' }}>songselect.ccli.com</a> for your song,
                click the "Text" option to view lyrics, then copy & paste them below.
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: c.muted, display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Title *</label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Song title" style={inp} />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: c.muted, display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Artist / Composer</label>
                <input value={form.artist} onChange={e => setForm({ ...form, artist: e.target.value })} placeholder="e.g. Hillsong United" style={inp} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: c.muted, display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Key</label>
                  <select value={form.key} onChange={e => setForm({ ...form, key: e.target.value })} style={inp}>
                    {KEY_OPTIONS.map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: c.muted, display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>BPM</label>
                  <input type="number" value={form.bpm} onChange={e => setForm({ ...form, bpm: e.target.value })} placeholder="e.g. 80" style={inp} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: c.muted, display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Lyrics</label>
                <div style={{ fontSize: '10px', color: c.muted, marginBottom: '6px' }}>
                  Use <code style={{ background: isDarkMode ? '#27272a' : '#f3f4f6', padding: '1px 3px', borderRadius: '3px' }}>[Verse 1]</code>, <code style={{ background: isDarkMode ? '#27272a' : '#f3f4f6', padding: '1px 3px', borderRadius: '3px' }}>[Chorus]</code>, <code style={{ background: isDarkMode ? '#27272a' : '#f3f4f6', padding: '1px 3px', borderRadius: '3px' }}>[Bridge]</code> labels for sections (used in Stage View)
                </div>
                <textarea
                  value={form.lyrics}
                  onChange={e => setForm({ ...form, lyrics: e.target.value })}
                  placeholder="[Verse 1]&#10;Paste or type lyrics here…&#10;&#10;[Chorus]&#10;…"
                  rows={10}
                  style={{ ...inp, resize: 'vertical', lineHeight: '1.7', fontFamily: 'monospace', fontSize: '12px' }}
                />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: c.text }}>
                <input
                  type="checkbox"
                  checked={form.is_public_domain}
                  onChange={e => setForm({ ...form, is_public_domain: e.target.checked })}
                />
                Public domain (no CCLI license required)
              </label>
            </div>

            {/* Modal footer */}
            <div style={{
              padding: '14px 20px', borderTop: `1px solid ${c.border}`,
              display: 'flex', justifyContent: 'flex-end', gap: '10px', flexShrink: 0,
            }}>
              <button onClick={() => setShowAddModal(false)} style={{
                background: 'transparent', border: `1px solid ${c.border}`,
                color: c.text, padding: '8px 18px', borderRadius: '7px',
                fontSize: '13px', fontWeight: '600', cursor: 'pointer',
              }}>
                Cancel
              </button>
              <button onClick={handleAddSong} disabled={!form.title.trim()} style={{
                background: form.title.trim() ? c.primary : c.muted,
                border: 'none', color: 'white', padding: '8px 18px',
                borderRadius: '7px', fontSize: '13px', fontWeight: '600',
                cursor: form.title.trim() ? 'pointer' : 'not-allowed',
              }}>
                Add Song
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
