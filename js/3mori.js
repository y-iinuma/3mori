var TAX_RATE = 1.1, jsonData, optList;

$(function(){
	//画面サイズ調整
	$(document).ready(function() {
		$(".3m-main,.numpad").css("width", $(window).width() + "px");
		$(".3m-main,.numpad").css("height", $(window).height() + "px");
	});
	$(window).resize(function() {
		$(".3m-main,.numpad").css("width", $(window).width() + "px");
		$(".3m-main,.numpad").css("height", $(window).height() + "px");
	});
	
	//スクロール禁止
	document.addEventListener("touchmove", function(e) {
		e.preventDefault();
	}, {passive: false});

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
	
	//数字パッドイベント
	$("input[id^=num]").on("click", function() {
		if ( $("#numinput").val().length >= 15 ) //最大長15桁（数値化によりオーバーフローする為）
			return false;
		$("#numinput").val( Number($("#numinput").val() + $(this).val()) );
	});
	$("#bs").on("click", function() {
		$("#numinput").val( $("#numinput").val().slice(0, -1) );
	});
	$("#ok").on("click", function() {
		if ( $("#numinput").val() == "" ) $("#numinput").val("0");
		$("#"+$("#targetid").val()).val( $("#numinput").val() )
			.blur();
		$(".numpad").css("display","none");
	});
	//入力イベントをラップ
	$("input[type=text]").focus( function() {
		$("#numinput").val( $(this).val() );
		$(".numpad").css("display","block");
		$("#targetid").val($(this).attr("id"))
		$(this).blur();
		return false;
	});

	$.getJSON("js/3mori.data.json", function(data) {
		jsonData = data;
		//キャリアプルダウン設定
		var option = $.map(data.carrier, function(val) {
			return $("<option>", { "value": val[0], "text": val[1] });
		});
		$("#carrier").empty()
			.append(option)
			.val("");
	}).error(function(jqXHR, textStatus, errorThrown) {
		alert("設定ファイルの読み込みでエラーが発生しました：" + textStatus);
	});

	

	//キャリア変更時
	$("#carrier").on("change",function() {
		$("input[name='order']").eq(0).prop("checked", true);
		var option = $.map(jsonData.device[$(this).val()], function(val) {
			return $("<option>", { "value": val, "text": jsonData.device[val].display });
		});
		
		//キャリア独自項目
		$.each(jsonData.carrier, function(i, val) {
			$("." + val[0]).each(function(){
				$(this).prop("disabled", !(val[0] == $("#carrier").val()));
			});
		});
		$("." + $("#carrier").val()).each(function(){
			$(this).prop("disabled", false);
		});
		
		$("#device").empty()
			.append(option)
			.change();
	});

	//デバイス変更時
	$("#device").on("change", function() {
		$("#price").val(jsonData.device[$(this).val() || "undef"].price)
			.blur();
		if ( ! $("#residual").prop("disabled") ) {
			$("#residual-amount").text(String(jsonData.device[$(this).val() || "undef"].residual).replace(/(\d)(?=(\d\d\d)+$)/g, '$1,') || 0)
				.blur();
		}
		var option = $("#device").val() ? $.map(jsonData.device[$("#device").val()].talkplan, function(val) {
			return $("<option>", { "value": val, "text": jsonData.talkplan[val].display });
		}) : null;
		$("#talk-plan").empty()
			.append(option)
			.change();
		sumDeviceFee();
		refleshOptionList();
	});
	
	//通話プラン変更時
	$("#talk-plan").on("change", function() {
		refleshOptionList();
		
		var combi = jsonData.talkplan[$("#talk-plan").val()].combination;
		if ( $("#combi_prev").val() == combi ) { //プラン区分が変わらなければ再計算してreturn
			sumPlanFee();
			return false;
		}
		var option = $("#talk-plan").val() ? $.map(combi, function(val) {
			return addOptionArray(val, jsonData.dataplan[val].display);
		}) : null;
		$("#data-plan").empty()
			.append(option)
			.change();
		$("#combi_prev").val(combi); //プラン区分保持
	});

	//データプラン変更時
	$("#data-plan").on("change", function() {
		//各種プルダウン初期化
		$("#bandle option").remove();
		$("#family option").remove();
		$("#discount option").remove();

		//バンドル割引プルダウン変更
		if ( $("#data-plan").val() == null ) return false;
		var val = jsonData.dataplan[$("#data-plan").val()].bandle;
		$("#bandle").append(addOptionArray(0, "なし"))
			.append(addOptionArray(val, "▲"+String(Math.floor(val * TAX_RATE)).replace(/(\d)(?=(\d\d\d)+$)/g, '$1,')+"円"))
			.change();

		//家族割引プルダウン変更
		val = jsonData.dataplan[$("#data-plan").val()].family;
		$("#family").append(addOptionArray(0, "なし"));
		for ( var i=0; i < val.length; i++ )
			$("#family").append(addOptionArray(val[i],
				//金額表示：税込表示と3桁区切り
				"▲" + String(Math.floor(val[i]*TAX_RATE)).replace(/(\d)(?=(\d\d\d)+$)/g, '$1,')　+ "円 ("
				//人数表示：最終アイテムのみ「以上」を末尾に付加
				+ (i+2) +"人" + (i == val.length - 1 ? "以上" : "") + ")"));
		$("#family").change();
		
		//その他割引プルダウン変更
		val = jsonData.dataplan[$("#data-plan").val()].discount;
		var option = $.map(val, function(elm) {
			return addOptionArray(jsonData.discount[elm].amount, 
				"▲" + String(Math.floor(jsonData.discount[elm].amount * TAX_RATE)).replace(/(\d)(?=(\d\d\d)+$)/g, '$1,') + "円 ("
				+ jsonData.discount[elm].display + ")");
		});
		$("#others").empty()
			.append(addOptionArray(0, "なし"))
			.append(option)
			.change();
		
		sumPlanFee();
	});
	
	//項目変更時再計算
	$("#bandle,#family,#others").on("change", function() {
		sumPlanFee();
	});

	optList = $("#optframe").contents().find("body").append("<div id='options'>").css("font-size","0.8rem").find("div");	
	$(optList).on("change", "input[name='options']", function() {
		sumPlanFee();
	});
	
	
	
	$("#device,#price,#discount,#residual").on("change", function() {
		sumDeviceFee();
	});
	
	$("input[name='installment']").on("change", function() {
		$("#residual").prop("disabled", !( $("input[name='installment']:checked").val() == 2 && $("#carrier").val() == "au" ));
		sumDeviceFee();
	});
	
});

function addOptionArray(val, txt) {
	return $("<option>", { "value": val, "text": txt });
}

function sumPlanFee() {
	var amount = jsonData.talkplan[$("#talk-plan").val()].amount
			+ jsonData.dataplan[$("#data-plan").val()].amount
			- $("#bandle").val()
			- $("#family").val()
			- $("#others").val();
	$(optList).find("input[name='options']:checked").each(function() {
		amount += Number($(this).val());
	});
	$("#plan-amount").text( String(Math.floor(amount*TAX_RATE)).replace(/(\d)(?=(\d\d\d)+$)/g, '$1,') );
	$("#total-amount").text( String(Number($("#device-amount").text().replace(/,/g, '')) + Number($("#plan-amount").text().replace(/,/g, ''))).replace(/(\d)(?=(\d\d\d)+$)/g, '$1,') );
}

function sumDeviceFee() {
	var amount = $("#price").val().replace(/,/g, '') - $("#discount").val().replace(/,/g, '');
	
	if ( $("#residual").prop("checked") && !($("#residual").prop("disabled")) ) { //かえトク選択時
		amount = (amount - $("#residual-amount").text().replace(/,/g, '')) / 23;
	} else {
		var inst = $("input[name='installment']:checked").val();
		amount = inst > 0 ? amount / (inst * 12) : 0;
	}
	
	$("#device-amount").text( String(Math.floor(amount)).replace(/(\d)(?=(\d\d\d)+$)/g, '$1,') );
	$("#total-amount").text( String(Number($("#device-amount").text().replace(/,/g, '')) + Number($("#plan-amount").text().replace(/,/g, ''))).replace(/(\d)(?=(\d\d\d)+$)/g, '$1,') );
}

function refleshOptionList() {
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
	$(optList).empty()
		.append(checkList);
	
	checkList = $.map(jsonData.talkplan[$("#talk-plan").val()].options, function(val) {
		var $optLine = $("<label>");
		$optLine.append($("<input/>").prop({
			"type": "checkbox",
			"name": "options",
			"value": jsonData.options[val].amount,
			"checked": jsonData.options[val].checked
		}));
		$optLine.append(jsonData.options[val].display);
		return $("<div>").append($optLine);
	});
	$(optList).append(checkList);
}
