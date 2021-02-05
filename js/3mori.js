var TAX_RATE = 1.1, jsonData;

$(function(){
	//3桁区切り
	$(".comma-num").focus(function(){
		$(this).val($(this).val().replace(/,/g, ''));
	}).blur(function(){
		$(this).val($(this).val().replace(/(\d)(?=(\d\d\d)+$)/g, '$1,'));
	});

	//常に最後尾を選択
	$(".comma-num").bind("touchend", function(){
		if (typeof($(this).get(0).selectionStart) != "undefined") {
			$(this).get(0).selectionStart = $(this).get(0).selectionEnd = $(this).val().length;
		} else if (document.selection) {
			$(this).get(0).createTextRange().select();
		}
	});

	$("#carrier").val("");

	$.getJSON("js/3mori.data.json", function(data) {
		jsonData = data;
	}).error(function(jqXHR, textStatus, errorThrown) {
		alert("設定ファイルの読み込みでエラーが発生しました：" + textStatus);
	});

	//キャリア変更時
	$("#carrier").on("change",function() {
		$("input[name='order']").eq(3).attr({"disabled": $(this).val() !== "docomo"});
		$("input[name='order']").eq(2).attr({"disabled": $(this).val() === "uqmobile"});
		$("input[name='order']").eq(0).prop("checked", true);
		var option = $.map(jsonData.device[$(this).val()], function(val) {
			return $("<option>", { "value": val, "text": jsonData.device[val].display });
		});
		$("#device").empty()
			.append(option)
			.change();
	});

	//デバイス変更時
	$("#device").on("change", function() {
		$("#price").val(jsonData.device[$(this).val() || "undef"].price)
			.blur();
		$("#deposit").val(jsonData.device[$(this).val() || "undef"].deposit || 0)
			.blur();
		var option = $("#device").val() ? $.map(jsonData.device[$("#device").val()].talkplan, function(val) {
			return $("<option>", { "value": val, "text": jsonData.talkplan[val].display });
		}) : null;
		$("#talk-plan").empty()
			.append(option)
			.change();
		var checkList = $("#device").val() ? $.map(jsonData.device[$("#device").val()].options, function(val) {
			var $optLine = $("<label>");
			$optLine.append($("<input/>").prop({
				"type": "checkbox",
				"name": "options",
				"value": jsonData.options[val].amount,
				"checked": jsonData.options[val].checked
			}));
			$optLine.append(jsonData.options[val].display);
			return $("<div>").append($optLine);
		}) : null;
		$("#options").empty()
			.append(checkList);
	});
	
	//通話プラン変更時
	$("#talk-plan").on("change", function() {
		var option = $("#talk-plan").val() ? $.map(jsonData.talkplan[$("#talk-plan").val()].combination, function(val) {
			return addOptionArray(val, jsonData.dataplan[val].display);
		}) : null;
		$("#data-plan").empty()
			.append(option)
			.change();
	});

	//データプラン変更時
	$("#data-plan").on("change", function() {
		//各種プルダウン初期化
		$("#bandle option").remove();
		$("#family option").remove();

		//バンドル割引プルダウン変更
		if ( $("#data-plan").val() == null ) return false;
		var b = jsonData.dataplan[$("#data-plan").val()].bandle;
		$("#bandle").append(addOptionArray(0, "なし"))
			.append(addOptionArray(b, "▲"+String(Math.floor(b*TAX_RATE)).replace(/(\d)(?=(\d\d\d)+$)/g, '$1,')+"円"))
			.change();

		//家族割引プルダウン変更
		b = jsonData.dataplan[$("#data-plan").val()].family;
		$("#family").append(addOptionArray(0, "なし"));
		for ( var i=0; i < b.length; i++ )
			$("#family").append(addOptionArray(b[i], "▲"+String(Math.floor(b[i]*TAX_RATE)).replace(/(\d)(?=(\d\d\d)+$)/g, '$1,')+"円　("+ i +"人" + (i == b.length ? "以上" : "") + ")"));
		$("#family").change();
		
		$("#plan-amount").text(sumPlanAmount());
	});
	
	//バンドル割引変更時
	$("#bandle,input[name='options']").on("change", function() {
		$("#plan-amount").text(sumPlanAmount());
	});
	
	
});

function addOptionArray(val, txt) {
	return $("<option>", { "value": val, "text": txt });
}

function sumPlanAmount() {
	var amount = jsonData.talkplan[$("#talk-plan").val()].amount + jsonData.dataplan[$("#data-plan").val()].amount - $("#bandle").val();
	$("input[name='options']:checked").each(function() {
		amount += +$(this).val();
	});
	return Math.floor(amount*TAX_RATE);
}


