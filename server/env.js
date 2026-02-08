/**
 * 必须在任何读取 process.env 的模块之前导入。
 * 先加载 .env，再加载 .env.local（本地覆盖）。
 */
import dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: '.env.local' });
