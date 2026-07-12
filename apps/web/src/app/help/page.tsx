import Link from "next/link";

const firstUseItems = [
	{
		title: "快速诊断一章",
		description: "适合刚写完一章，快速查看问题。系统会自动创建一本小说和第一章。",
	},
	{
		title: "导入整本小说",
		description: "适合长期管理作品，TXT 会自动拆分章节。",
	},
];

const chapterItems = [
	{
		title: "正文批注",
		description: "查看正文位置、问题分析和修改建议。",
	},
	{
		title: "诊断分析",
		description: "查看本章整体优点、问题优先级和评分依据。",
	},
	{
		title: "修改方案",
		description: "选择问题后生成修改指令，并预览修改。",
	},
	{
		title: "修改效果",
		description: "比较版本变化，确认问题是否解决。",
	},
];

const colorItems = [
	{
		title: "绿色修改",
		description: "表示当前版本相对于上一版本发生变化，点击可以查看修改前内容。",
	},
	{
		title: "问题等级",
		description: "必须修改：影响阅读；建议修改：提升效果；可优化：锦上添花。",
	},
];

const faqItems = [
	{
		title: "AI 判断一定正确吗？",
		description: "不是。可以接受、忽略或标记判断错误。",
	},
	{
		title: "AI 会改变剧情吗？",
		description: "修改模式可以控制范围：润色、局部修改、段落重写。",
	},
	{
		title: "整本小说如何分析？",
		description: "建议导入整本后逐章诊断。",
	},
];

const mainFlow = ["创建小说", "章节诊断", "选择问题", "修改正文", "查看效果"];
const rewriteFlow = ["接受问题", "生成修改方案", "预览修改", "保存新版本", "复查效果"];

export default function HelpPage() {
	return (
		<main className="min-h-screen bg-[#f5f6f8] py-[30px] text-[#20242b]">
			<div className="mx-auto w-[min(900px,calc(100%_-_32px))]">
				<section className="mb-4 rounded-[14px] border border-[#e4e7eb] bg-white p-[22px]">
					<div className="mb-4 flex flex-wrap items-start justify-between gap-3">
						<div>
							<h1 className="m-0 text-[28px] font-bold leading-tight">
								AI 网文诊断台帮助中心
							</h1>
							<p className="mt-2 text-sm leading-7 text-[#606873]">
								上传小说章节 → 找到问题 → 修改正文 → 检查修改效果。
							</p>
						</div>
						<Link
							href="/diagnose/quick"
							className="rounded-full border border-[#e5e8ec] bg-white px-4 py-2 text-xs font-bold text-[#555] transition hover:border-[#ffc3aa] hover:text-[#c74413]"
						>
							返回诊断台
						</Link>
					</div>
					<HelpFlow items={mainFlow} />
				</section>

				<HelpCard title="第一次使用" items={firstUseItems} />
				<HelpCard title="章节页面" items={chapterItems} />

				<section className="mb-4 rounded-[14px] border border-[#e4e7eb] bg-white p-[22px]">
					<h2 className="m-0 mb-2.5 text-[17px] font-bold">修改建议如何处理</h2>
					<p className="mb-3 text-sm leading-7 text-[#606873]">
						不要一次修改所有问题。建议每次处理 1～3 个核心问题：
					</p>
					<HelpFlow items={rewriteFlow} />
				</section>

				<HelpCard title="颜色说明" items={colorItems} />
				<HelpCard title="常见问题" items={faqItems} />

				<div className="rounded-[10px] bg-[#eef4ff] p-3 text-sm leading-7 text-[#405a85]">
					提示：如果共享模型排队或不可用，可以在“AI 模型服务设置”里切换自己的模型服务。
				</div>
			</div>
		</main>
	);
}

function HelpFlow({ items }: { items: string[] }) {
	return (
		<div className="flex flex-wrap gap-2">
			{items.map((item) => (
				<span
					key={item}
					className="rounded-full bg-[#fff1eb] px-3 py-2 text-sm font-bold text-[#c74413]"
				>
					{item}
				</span>
			))}
		</div>
	);
}

function HelpCard({
	title,
	items,
}: {
	title: string;
	items: Array<{ title: string; description: string }>;
}) {
	return (
		<section className="mb-4 rounded-[14px] border border-[#e4e7eb] bg-white p-[22px]">
			<h2 className="m-0 mb-2.5 text-[17px] font-bold">{title}</h2>
			<div>
				{items.map((item) => (
					<div
						key={item.title}
						className="my-2 border-l-[3px] border-[#ff5a1f] bg-[#fafbfc] p-2.5 text-sm leading-7"
					>
						<b>{item.title}</b>
						<br />
						<span className="text-[#606873]">{item.description}</span>
					</div>
				))}
			</div>
		</section>
	);
}
