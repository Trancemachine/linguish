import type { KnowledgeBase, StatsSummary, Word, WordBookEntry } from "./types";

export const DEMO_KB_ID = "demo-kb-1";
export const DEMO_USER_ID = "guest";

export const demoKnowledgeBases: KnowledgeBase[] = [
  {
    id: DEMO_KB_ID,
    name: "日常学术词汇",
    current_word_id: "w-3",
    created_at: new Date().toISOString(),
    document_count: 2,
    documents: [
      {
        id: "doc-1",
        knowledge_base_id: DEMO_KB_ID,
        file_name: "academic-vocabulary.pdf",
        file_hash: "abc123",
        status: "completed",
        created_at: new Date().toISOString(),
      },
      {
        id: "doc-2",
        knowledge_base_id: DEMO_KB_ID,
        file_name: "research-notes.docx",
        file_hash: "def456",
        status: "completed",
        created_at: new Date().toISOString(),
      },
    ],
  },
  {
    id: "demo-kb-2",
    name: "面试常用表达",
    current_word_id: null,
    created_at: new Date().toISOString(),
    document_count: 1,
    documents: [
      {
        id: "doc-3",
        knowledge_base_id: "demo-kb-2",
        file_name: "interview-phrases.txt",
        file_hash: "ghi789",
        status: "pending",
        created_at: new Date().toISOString(),
      },
    ],
  },
];

export const demoWords: Word[] = [
  { id: "w-1", knowledge_base_id: DEMO_KB_ID, word: "Artificial intelligence", translation: "人工智能", example: "Artificial intelligence is transforming every industry.", importance: 100 },
  { id: "w-2", knowledge_base_id: DEMO_KB_ID, word: "Machine learning", translation: "机器学习", example: "Machine learning algorithms improve with more data.", importance: 99 },
  { id: "w-3", knowledge_base_id: DEMO_KB_ID, word: "Deep learning", translation: "深度学习", example: "Deep learning has achieved remarkable results in image recognition.", importance: 98 },
  { id: "w-4", knowledge_base_id: DEMO_KB_ID, word: "Neural network", translation: "神经网络", example: "The neural network consists of multiple layers of interconnected nodes.", importance: 97 },
  { id: "w-5", knowledge_base_id: DEMO_KB_ID, word: "Natural language processing", translation: "自然语言处理", example: "Natural language processing enables computers to understand human language.", importance: 96 },
  { id: "w-6", knowledge_base_id: DEMO_KB_ID, word: "Speech recognition", translation: "语音识别", example: "Speech recognition technology has become increasingly accurate.", importance: 94 },
  { id: "w-7", knowledge_base_id: DEMO_KB_ID, word: "Computer vision", translation: "计算机视觉", example: "Computer vision allows machines to interpret visual information.", importance: 93 },
  { id: "w-8", knowledge_base_id: DEMO_KB_ID, word: "Model", translation: "模型", example: "The model achieved 95% accuracy on the test dataset.", importance: 92 },
  { id: "w-9", knowledge_base_id: DEMO_KB_ID, word: "Robot", translation: "机器人", example: "The robot can navigate complex environments autonomously.", importance: 91 },
  { id: "w-10", knowledge_base_id: DEMO_KB_ID, word: "Agent", translation: "智能体", example: "The AI agent learned to play the game through reinforcement learning.", importance: 90 },
  { id: "w-11", knowledge_base_id: DEMO_KB_ID, word: "Code", translation: "代码", example: "Clean code is easier to maintain and debug.", importance: 89 },
  { id: "w-12", knowledge_base_id: DEMO_KB_ID, word: "Program", translation: "程序", example: "The program processes data and generates reports automatically.", importance: 88 },
  { id: "w-13", knowledge_base_id: DEMO_KB_ID, word: "Framework", translation: "框架", example: "This framework provides a solid foundation for web development.", importance: 87 },
  { id: "w-14", knowledge_base_id: DEMO_KB_ID, word: "Interface", translation: "接口", example: "The user interface should be intuitive and responsive.", importance: 86 },
  { id: "w-15", knowledge_base_id: DEMO_KB_ID, word: "Database", translation: "数据库", example: "The database stores millions of records efficiently.", importance: 85 },
  { id: "w-16", knowledge_base_id: DEMO_KB_ID, word: "Function", translation: "函数", example: "This function calculates the average of all input values.", importance: 84 },
  { id: "w-17", knowledge_base_id: DEMO_KB_ID, word: "Variable", translation: "变量", example: "The variable stores temporary data during program execution.", importance: 83 },
  { id: "w-18", knowledge_base_id: DEMO_KB_ID, word: "Debug", translation: "调试", example: "It took the engineer several hours to debug the complex issue.", importance: 82 },
  { id: "w-19", knowledge_base_id: DEMO_KB_ID, word: "Module", translation: "模块", example: "Each module handles a specific aspect of the application.", importance: 81 },
  { id: "w-20", knowledge_base_id: DEMO_KB_ID, word: "Compiler", translation: "编译器", example: "The compiler translates source code into machine code.", importance: 80 },
  { id: "w-21", knowledge_base_id: DEMO_KB_ID, word: "Data", translation: "数据", example: "Big data analytics reveals patterns that were previously invisible.", importance: 95 },
  { id: "w-22", knowledge_base_id: DEMO_KB_ID, word: "Big data", translation: "大数据", example: "Big data technologies enable processing of massive datasets.", importance: 94 },
  { id: "w-23", knowledge_base_id: DEMO_KB_ID, word: "Algorithm", translation: "算法", example: "The algorithm sorts the array in logarithmic time.", importance: 93 },
  { id: "w-24", knowledge_base_id: DEMO_KB_ID, word: "Feature", translation: "特征", example: "Feature engineering is critical for machine learning performance.", importance: 90 },
  { id: "w-25", knowledge_base_id: DEMO_KB_ID, word: "Parameter", translation: "参数", example: "The model has millions of parameters that need tuning.", importance: 89 },
  { id: "w-26", knowledge_base_id: DEMO_KB_ID, word: "Sample", translation: "样本", example: "The training sample must be representative of the population.", importance: 88 },
  { id: "w-27", knowledge_base_id: DEMO_KB_ID, word: "Dimension", translation: "维度", example: "High-dimensional data often requires dimensionality reduction.", importance: 86 },
  { id: "w-28", knowledge_base_id: DEMO_KB_ID, word: "Cache", translation: "缓存", example: "The cache stores frequently accessed data for faster retrieval.", importance: 84 },
  { id: "w-29", knowledge_base_id: DEMO_KB_ID, word: "Index", translation: "索引", example: "The database index speeds up query performance significantly.", importance: 83 },
  { id: "w-30", knowledge_base_id: DEMO_KB_ID, word: "Statistics", translation: "统计", example: "Statistics provides tools for making sense of data.", importance: 82 },
  { id: "w-31", knowledge_base_id: DEMO_KB_ID, word: "Chip", translation: "芯片", example: "The new chip delivers unprecedented computing power.", importance: 81 },
  { id: "w-32", knowledge_base_id: DEMO_KB_ID, word: "Server", translation: "服务器", example: "The server handles thousands of requests per second.", importance: 80 },
  { id: "w-33", knowledge_base_id: DEMO_KB_ID, word: "Memory", translation: "内存", example: "The program consumes a lot of memory when processing large files.", importance: 79 },
  { id: "w-34", knowledge_base_id: DEMO_KB_ID, word: "Hardware", translation: "硬件", example: "Hardware acceleration can significantly improve training speed.", importance: 78 },
  { id: "w-35", knowledge_base_id: DEMO_KB_ID, word: "Protocol", translation: "网络协议", example: "The communication protocol ensures reliable data transmission.", importance: 77 },
  { id: "w-36", knowledge_base_id: DEMO_KB_ID, word: "Bandwidth", translation: "带宽", example: "High bandwidth is essential for streaming large datasets.", importance: 76 },
  { id: "w-37", knowledge_base_id: DEMO_KB_ID, word: "Firewall", translation: "防火墙", example: "The firewall protects the network from unauthorized access.", importance: 75 },
  { id: "w-38", knowledge_base_id: DEMO_KB_ID, word: "Terminal", translation: "终端", example: "The developer used the terminal to run commands.", importance: 74 },
  { id: "w-39", knowledge_base_id: DEMO_KB_ID, word: "Gateway", translation: "网关", example: "The API gateway routes requests to the appropriate services.", importance: 73 },
  { id: "w-40", knowledge_base_id: DEMO_KB_ID, word: "Storage", translation: "存储", example: "Cloud storage offers scalable solutions for data persistence.", importance: 72 },
  { id: "w-41", knowledge_base_id: DEMO_KB_ID, word: "Training", translation: "模型训练", example: "Model training requires substantial computational resources.", importance: 95 },
  { id: "w-42", knowledge_base_id: DEMO_KB_ID, word: "Inference", translation: "推理", example: "Inference is the process of making predictions using a trained model.", importance: 94 },
  { id: "w-43", knowledge_base_id: DEMO_KB_ID, word: "Optimization", translation: "优化", example: "Gradient descent is a popular optimization algorithm.", importance: 93 },
  { id: "w-44", knowledge_base_id: DEMO_KB_ID, word: "Classification", translation: "分类", example: "Image classification assigns a label to an input image.", importance: 92 },
  { id: "w-45", knowledge_base_id: DEMO_KB_ID, word: "Regression", translation: "回归", example: "Linear regression models the relationship between variables.", importance: 91 },
  { id: "w-46", knowledge_base_id: DEMO_KB_ID, word: "Cloud computing", translation: "云计算", example: "Cloud computing provides on-demand access to computing resources.", importance: 88 },
  { id: "w-47", knowledge_base_id: DEMO_KB_ID, word: "Automation", translation: "自动化", example: "Automation reduces manual effort and minimizes errors.", importance: 87 },
  { id: "w-48", knowledge_base_id: DEMO_KB_ID, word: "Embedding", translation: "向量嵌入", example: "Word embeddings capture semantic relationships between words.", importance: 86 },
  { id: "w-49", knowledge_base_id: DEMO_KB_ID, word: "Blockchain", translation: "区块链", example: "Blockchain provides a decentralized ledger for transactions.", importance: 85 },
  { id: "w-50", knowledge_base_id: DEMO_KB_ID, word: "Virtual reality", translation: "虚拟现实", example: "Virtual reality creates immersive simulated environments.", importance: 84 },
];

export const demoStats: StatsSummary = {
  today_words: 42,
  today_dialogues: 7,
  today_duration_minutes: 45,
  month_words: 312,
  month_dialogues: 48,
  month_duration_minutes: 620,
};

export const demoWordBook: WordBookEntry[] = [
  {
    id: "wb-1",
    word_id: "w-2",
    source: "manual",
    word: demoWords[1],
  },
  {
    id: "wb-2",
    word_id: "w-5",
    source: "wrong",
    word: demoWords[4],
  },
];

export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project")
  );
}
