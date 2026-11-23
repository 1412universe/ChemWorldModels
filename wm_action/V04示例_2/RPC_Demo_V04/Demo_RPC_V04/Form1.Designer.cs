namespace Demo_RPC_V04
{
    partial class Form1
    {
        /// <summary>
        ///  Required designer variable.
        /// </summary>
        private System.ComponentModel.IContainer components = null;

        /// <summary>
        ///  Clean up any resources being used.
        /// </summary>
        /// <param name="disposing">true if managed resources should be disposed; otherwise, false.</param>
        protected override void Dispose(bool disposing)
        {
            if (disposing && (components != null))
            {
                components.Dispose();
            }
            base.Dispose(disposing);
        }

        #region Windows Form Designer generated code

        /// <summary>
        ///  Required method for Designer support - do not modify
        ///  the contents of this method with the code editor.
        /// </summary>
        private void InitializeComponent()
        {
            button1 = new Button();
            button2 = new Button();
            button3 = new Button();
            button4 = new Button();
            button5 = new Button();
            button6 = new Button();
            button7 = new Button();
            listView1 = new ListView();
            listView2 = new ListView();
            button8 = new Button();
            label1 = new Label();
            button9 = new Button();
            textBox1 = new TextBox();
            button10 = new Button();
            button11 = new Button();
            button12 = new Button();
            treeViewBoards = new TreeView();
            button13 = new Button();
            button14 = new Button();
            labelHost = new Label();
            textBoxHost = new TextBox();
            labelPort = new Label();
            textBoxPort = new TextBox();
            labelVersion = new Label();
            comboBoxVersion = new ComboBox();
            SuspendLayout();
            // 
            // button1
            // 
            button1.Location = new Point(76, 359);
            button1.Margin = new Padding(4);
            button1.Name = "button1";
            button1.Size = new Size(143, 44);
            button1.TabIndex = 0;
            button1.Text = "停止";
            button1.UseVisualStyleBackColor = true;
            button1.Click += button1_Click;
            // 
            // button2
            // 
            button2.Location = new Point(76, 459);
            button2.Margin = new Padding(4);
            button2.Name = "button2";
            button2.Size = new Size(143, 44);
            button2.TabIndex = 1;
            button2.Text = "复位";
            button2.UseVisualStyleBackColor = true;
            button2.Click += button2_Click;
            // 
            // button3
            // 
            button3.Location = new Point(76, 114);
            button3.Margin = new Padding(4);
            button3.Name = "button3";
            button3.Size = new Size(143, 44);
            button3.TabIndex = 2;
            button3.Text = "连接";
            button3.UseVisualStyleBackColor = true;
            button3.Click += button3_Click;
            // 
            // button4
            // 
            button4.Location = new Point(76, 561);
            button4.Margin = new Padding(4);
            button4.Name = "button4";
            button4.Size = new Size(143, 44);
            button4.TabIndex = 3;
            button4.Text = "启动";
            button4.UseVisualStyleBackColor = true;
            button4.Click += button4_Click;
            // 
            // button5
            // 
            button5.Location = new Point(76, 771);
            button5.Margin = new Padding(4);
            button5.Name = "button5";
            button5.Size = new Size(143, 44);
            button5.TabIndex = 4;
            button5.Text = "继续";
            button5.UseVisualStyleBackColor = true;
            button5.Click += button5_Click;
            // 
            // button6
            // 
            button6.Location = new Point(76, 664);
            button6.Margin = new Padding(4);
            button6.Name = "button6";
            button6.Size = new Size(143, 44);
            button6.TabIndex = 5;
            button6.Text = "暂停";
            button6.UseVisualStyleBackColor = true;
            button6.Click += button6_Click;
            // 
            // button7
            // 
            button7.Location = new Point(76, 262);
            button7.Margin = new Padding(4);
            button7.Name = "button7";
            button7.Size = new Size(143, 44);
            button7.TabIndex = 6;
            button7.Text = "获取方案";
            button7.UseVisualStyleBackColor = true;
            button7.Click += button7_Click;
            // 
            // listView1
            // 
            listView1.Location = new Point(293, 114);
            listView1.Margin = new Padding(4);
            listView1.Name = "listView1";
            listView1.Size = new Size(497, 700);
            listView1.TabIndex = 7;
            listView1.UseCompatibleStateImageBehavior = false;
            listView1.View = View.List;
            listView1.MouseDoubleClick += ListView1_MouseDoubleClick;
            // 
            // listView2
            // 
            listView2.Location = new Point(829, 114);
            listView2.Margin = new Padding(4);
            listView2.Name = "listView2";
            listView2.Size = new Size(497, 1040);
            listView2.TabIndex = 8;
            listView2.UseCompatibleStateImageBehavior = false;
            listView2.View = View.List;
            // 
            // button8
            // 
            button8.Location = new Point(76, 877);
            button8.Margin = new Padding(4);
            button8.Name = "button8";
            button8.Size = new Size(143, 44);
            button8.TabIndex = 9;
            button8.Text = "更新步骤状态";
            button8.UseVisualStyleBackColor = true;
            button8.Click += button8_Click;
            // 
            // label1
            // 
            label1.AutoSize = true;
            label1.ForeColor = Color.Red;
            label1.Location = new Point(94, 186);
            label1.Margin = new Padding(4, 0, 4, 0);
            label1.Name = "label1";
            label1.Size = new Size(86, 31);
            label1.TabIndex = 10;
            label1.Text = "未连接";
            // 
            // button9
            // 
            button9.Location = new Point(76, 971);
            button9.Margin = new Padding(4);
            button9.Name = "button9";
            button9.Size = new Size(143, 44);
            button9.TabIndex = 11;
            button9.Text = "添加方案";
            button9.UseVisualStyleBackColor = true;
            button9.Click += button9_Click;
            // 
            // textBox1
            // 
            textBox1.Location = new Point(261, 978);
            textBox1.Margin = new Padding(4);
            textBox1.Name = "textBox1";
            textBox1.Size = new Size(190, 38);
            textBox1.TabIndex = 12;
            textBox1.Text = "test";
            // 
            // button10
            // 
            button10.Location = new Point(1372, 114);
            button10.Margin = new Padding(4);
            button10.Name = "button10";
            button10.Size = new Size(143, 44);
            button10.TabIndex = 13;
            button10.Text = "获取布局";
            button10.UseVisualStyleBackColor = true;
            button10.Click += button10_Click;
            // 
            // button11
            // 
            button11.Location = new Point(1372, 186);
            button11.Margin = new Padding(4);
            button11.Name = "button11";
            button11.Size = new Size(143, 44);
            button11.TabIndex = 14;
            button11.Text = "修改位置";
            button11.UseVisualStyleBackColor = true;
            button11.Click += button11_Click;
            // 
            // button12
            // 
            button12.Location = new Point(1372, 262);
            button12.Margin = new Padding(4);
            button12.Name = "button12";
            button12.Size = new Size(143, 44);
            button12.TabIndex = 15;
            button12.Text = "添加布局";
            button12.UseVisualStyleBackColor = true;
            button12.Click += button12_Click;
            // 
            // treeViewBoards
            // 
            treeViewBoards.Location = new Point(1372, 323);
            treeViewBoards.Margin = new Padding(4);
            treeViewBoards.Name = "treeViewBoards";
            treeViewBoards.Size = new Size(317, 831);
            treeViewBoards.TabIndex = 16;
            // 
            // button13
            // 
            button13.Location = new Point(1533, 114);
            button13.Margin = new Padding(4);
            button13.Name = "button13";
            button13.Size = new Size(143, 44);
            button13.TabIndex = 17;
            button13.Text = "删除布局";
            button13.UseVisualStyleBackColor = true;
            button13.Click += button13_Click;
            // 
            // button14
            // 
            button14.Location = new Point(308, 857);
            button14.Margin = new Padding(4);
            button14.Name = "button14";
            button14.Size = new Size(143, 44);
            button14.TabIndex = 18;
            button14.Text = "获取运行状态";
            button14.UseVisualStyleBackColor = true;
            button14.Click += button14_Click;
            // 
            // labelHost
            // 
            labelHost.AutoSize = true;
            labelHost.Location = new Point(76, 62);
            labelHost.Margin = new Padding(4, 0, 4, 0);
            labelHost.Name = "labelHost";
            labelHost.Size = new Size(47, 31);
            labelHost.TabIndex = 19;
            labelHost.Text = "IP:";
            // 
            // textBoxHost
            // 
            textBoxHost.Location = new Point(125, 58);
            textBoxHost.Margin = new Padding(4);
            textBoxHost.Name = "textBoxHost";
            textBoxHost.Size = new Size(160, 38);
            textBoxHost.TabIndex = 20;
            textBoxHost.Text = "127.0.0.1";
            // 
            // labelPort
            // 
            labelPort.AutoSize = true;
            labelPort.Location = new Point(304, 62);
            labelPort.Margin = new Padding(4, 0, 4, 0);
            labelPort.Name = "labelPort";
            labelPort.Size = new Size(82, 31);
            labelPort.TabIndex = 21;
            labelPort.Text = "端口:";
            // 
            // textBoxPort
            // 
            textBoxPort.Location = new Point(388, 58);
            textBoxPort.Margin = new Padding(4);
            textBoxPort.Name = "textBoxPort";
            textBoxPort.Size = new Size(100, 38);
            textBoxPort.TabIndex = 22;
            textBoxPort.Text = "9999";
            // 
            // labelVersion
            // 
            labelVersion.AutoSize = true;
            labelVersion.Location = new Point(508, 62);
            labelVersion.Margin = new Padding(4, 0, 4, 0);
            labelVersion.Name = "labelVersion";
            labelVersion.Size = new Size(82, 31);
            labelVersion.TabIndex = 23;
            labelVersion.Text = "版本:";
            // 
            // comboBoxVersion
            // 
            comboBoxVersion.DropDownStyle = ComboBoxStyle.DropDownList;
            comboBoxVersion.FormattingEnabled = true;
            comboBoxVersion.Items.AddRange(new object[] { "V04", "V03" });
            comboBoxVersion.Location = new Point(592, 54);
            comboBoxVersion.Margin = new Padding(4);
            comboBoxVersion.Name = "comboBoxVersion";
            comboBoxVersion.Size = new Size(140, 39);
            comboBoxVersion.TabIndex = 24;
            // 
            // Form1
            // 
            AutoScaleDimensions = new SizeF(14F, 31F);
            AutoScaleMode = AutoScaleMode.Font;
            ClientSize = new Size(1700, 1184);
            Controls.Add(labelHost);
            Controls.Add(textBoxHost);
            Controls.Add(labelPort);
            Controls.Add(textBoxPort);
            Controls.Add(labelVersion);
            Controls.Add(comboBoxVersion);
            Controls.Add(button14);
            Controls.Add(button13);
            Controls.Add(treeViewBoards);
            Controls.Add(button12);
            Controls.Add(button11);
            Controls.Add(button10);
            Controls.Add(textBox1);
            Controls.Add(button9);
            Controls.Add(label1);
            Controls.Add(button8);
            Controls.Add(listView2);
            Controls.Add(listView1);
            Controls.Add(button7);
            Controls.Add(button6);
            Controls.Add(button5);
            Controls.Add(button4);
            Controls.Add(button3);
            Controls.Add(button2);
            Controls.Add(button1);
            Margin = new Padding(4);
            Name = "Form1";
            Text = "Form1";
            ResumeLayout(false);
            PerformLayout();
        }

        #endregion

        private Button button1;
        private Button button2;
        private Button button3;
        private Button button4;
        private Button button5;
        private Button button6;
        private Button button7;
        private ListView listView1;
        private ListView listView2;
        private Button button8;
        private Label label1;
        private Button button9;
        private TextBox textBox1;
        private Button button10;
        private Button button11;
        private Button button12;
        private TreeView treeViewBoards;
        private Button button13;
        private Button button14;
        private Label labelHost;
        private TextBox textBoxHost;
        private Label labelPort;
        private TextBox textBoxPort;
        private Label labelVersion;
        private ComboBox comboBoxVersion;
    }
}
