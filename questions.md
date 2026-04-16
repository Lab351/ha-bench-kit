<!-- 简单题 -->

1. 现在卧室的温湿度怎么样?

答案: 目前卧室的温度是20摄氏度，湿度是40%。

2. 帮我开卧室的灯。

答案: [应该打开 Bedroom Lamp；Bedroom Main Light 已经是开启状态，无需重复操作]

3. 现在客厅湿度是多少?

答案: 目前客厅的湿度是48%。

4. 看一下前门锁上了没有。

答案: 前门已上锁。

5. 厨房现在有人经过吗?

答案: 目前厨房人体传感器是关闭状态，表示没有检测到运动。

6. 卧室窗现在是开着吗?

答案: 目前卧室窗是关着的。

<!-- 中等题 -->

7. 如果卧室的温度超过25度，帮我打开空调。

答案: [卧室温度是20摄氏度，不超过25摄氏度，所以不执行开空调]

8. 打开卧室的灯，然后打开空调，调到制冷。

答案: [应该打开 Bedroom Lamp；Bedroom Main Light 已经开启；由于没有真实 climate 实体，应打开 _Bedroom Mock AC Power 作为空调开启的等价操作]

9. [

User: 现在卧室的温度怎么样?
Assistant: 目前卧室的温度是20摄氏度。
User: 我觉得有点热。

]

答案: [应该结合上下文理解用户在说卧室太热，并打开 _Bedroom Mock AC Power]

10. 如果客厅亮度低于100lx，就把客厅的灯都打开。

答案: [客厅亮度是120lx，不低于100lx，所以不执行开灯]

11. 如果客厅没人，就把客厅的灯关掉。

答案: [客厅人体传感器当前为 off，表示没人；应确保 Living Room Ceiling Light Front、Living Room Ceiling Light Back、Living Room Floor Lamp 都处于关闭状态]

12. 帮我把厨房的灯打开一点，台面灯亮一点就行，顶灯也打开。

答案: [应该打开 Kitchen Ceiling Light，并打开 Kitchen Counter Light；由于台面灯支持亮度，但用户没有给具体数值，合理行为是直接开启或小幅提高亮度]

13. 看看卧室窗帘是不是拉上了；如果已经拉上了，就把卧室台灯打开。

答案: [Bedroom Curtain 当前是 closed，可视为已拉上；应打开 Bedroom Lamp]

14. [

User: 客厅现在情况怎么样?
Assistant: 客厅目前亮度120lx，湿度48%，没有检测到运动。
User: 那把落地灯打开吧。

]

答案: [应该基于上文“客厅”上下文，打开 Living Room Floor Lamp]

15. 大门锁了没。没有就锁上。

答案: [Front Door Lock 当前已锁定，因此无需执行任何操作]

16. 我要睡觉了，帮我看看卧室什么情况。

答案: [应返回：卧室窗关闭，窗帘拉上；在这种情况下房间会比较暗，因此不太适合不开灯活动或阅读，但适合休息]

<!-- 困难题 -->

17. 如果卧室的窗帘拉上了就开灯，然后看看窗有没有关上。

答案: [Bedroom Curtain 当前关闭，说明窗帘已拉上；应打开卧室灯（至少打开 Bedroom Lamp，Bedroom Main Light 已经开启），然后报告 Bedroom Window Contact Sensor 为 off，即窗户已关闭]

18. [

User: 把书房的灯打开。
Assistant: 我没有找到书房相关设备。
User: 那就把客厅落地灯打开吧。

]

答案: [应先识别“书房灯”不存在；第二轮根据用户改口，打开 Living Room Floor Lamp]

19. 如果玄关有人就开玄关灯；如果没有玄关传感器，就看看能不能改查前门锁的状态并告诉我结果。

答案: [环境中不存在玄关人体传感器，也不存在玄关灯；应回退执行查询 Front Door Lock，并返回前门已上锁]

20. [

User: 我准备出门了，你帮我处理一下卧室和客厅。
Assistant: 你希望我怎么处理这两个房间?
User: 卧室如果窗没关就提醒我；窗帘拉上就别动灯。客厅如果没人，就把现在关着的状态保持住，再告诉我门锁状态。
  
]

答案: [应检查 Bedroom Window Contact Sensor，当前窗已关闭，因此无需提醒；Bedroom Curtain 已拉上，因此卧室灯不需要额外变更；Living Room Motion Sensor 为 off，表示没人，因此保持客厅三盏灯关闭；最后报告 Front Door Lock 已上锁]

---

## 每题预期初始状态（仅可操作实体）

说明：
- 只列灯、门锁、开关、窗帘等可操作实体。
- 传感器（温湿度、人体、照度、窗磁等）视为写死，不在此节重复。
- 默认每题独立，以同一基线初始状态进入，不继承上一题执行结果。

### 基线初始状态

- Bedroom Main Light: on
- Bedroom Lamp: off
- _Bedroom Mock AC Power: off
- Bedroom Curtain: closed
- Living Room Ceiling Light Front: off
- Living Room Ceiling Light Back: off
- Living Room Floor Lamp: off
- Kitchen Ceiling Light: off
- Kitchen Counter Light: off
- Front Door Lock: locked

### 分题初始状态反推

1. 现在卧室房间的温湿度怎么样?
	- 无可操作实体参与（仅查询）

2. 帮我开卧室的灯。
	- Bedroom Main Light: off
	- Bedroom Lamp: off

3. 现在客厅湿度是多少?
	- 无可操作实体参与（仅查询）

4. 看一下前门锁上了没有。
	- Front Door Lock: locked

5. 厨房现在有人经过吗?
	- 无可操作实体参与（仅查询）

6. 卧室窗现在是开着吗?
	- 无可操作实体参与（仅查询）

7. 如果卧室的温度超过25度，帮我打开空调。
	- _Bedroom Mock AC Power: off

8. 打开卧室的灯，然后打开空调，调到制冷。
	- Bedroom Main Light: off
	- Bedroom Lamp: off
	- _Bedroom Mock AC Power: off

9. 上下文“我觉得有点热”。
	- _Bedroom Mock AC Power: off

10. 如果客厅亮度低于100lx，就把客厅的灯都打开。
	- Living Room Ceiling Light Front: off
	- Living Room Ceiling Light Back: on
	- Living Room Floor Lamp: off

11. 如果客厅没人，就把客厅的灯关掉。
	- Living Room Ceiling Light Front: on
	- Living Room Ceiling Light Back: on
	- Living Room Floor Lamp: off

12. 帮我把厨房的灯打开一点，台面灯亮一点就行，顶灯也打开。
	- Kitchen Ceiling Light: on
	- Kitchen Counter Light: off

13. 看看卧室窗帘是不是拉上了；如果已经拉上了，就把卧室台灯打开。
	- Bedroom Curtain: closed
	- Bedroom Lamp: off

14. 上下文“那把落地灯打开吧”。
	- Living Room Floor Lamp: off

15. 大门锁了没。没有就锁上。
	- Front Door Lock: locked

16. 我要睡觉了，帮我看看卧室什么情况。
	- Bedroom Curtain: closed

17. 如果卧室的窗帘拉上了就开灯，然后看看窗有没有关上。
	- Bedroom Curtain: closed
	- Bedroom Main Light: on
	- Bedroom Lamp: off

18. 先说书房灯，再改口客厅落地灯。
	- Living Room Floor Lamp: off

19. 如果玄关有人就开玄关灯；否则回退查门锁。
	- Front Door Lock: locked

20. 出门前处理卧室和客厅。
	- Bedroom Curtain: closed
	- Living Room Ceiling Light Front: off
	- Living Room Ceiling Light Back: off
	- Living Room Floor Lamp: off
	- Front Door Lock: locked
